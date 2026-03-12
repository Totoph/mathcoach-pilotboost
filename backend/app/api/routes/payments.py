from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.core.config import get_settings
from app.core.supabase import get_supabase_client, get_supabase_admin
import stripe
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])

settings = get_settings()
stripe.api_key = settings.stripe_secret_key if hasattr(settings, 'stripe_secret_key') else ""

# ─── Price IDs (set via env or hardcode for dev) ───
PRICE_MAP = {
    "monthly": getattr(settings, 'stripe_price_monthly', ''),
    "yearly": getattr(settings, 'stripe_price_yearly', ''),
    "lifetime": getattr(settings, 'stripe_price_lifetime', ''),
}


# ─── Helpers ───

def get_user_id_from_request(request: Request) -> str:
    """Extract user_id from the Authorization header (Supabase JWT)."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ", 1)[1]
    
    try:
        sb = get_supabase_client()
        user = sb.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


# ─── Schemas ───

class CreateCheckoutRequest(BaseModel):
    plan: str  # "monthly" | "yearly" | "lifetime"


class SubscriptionStatus(BaseModel):
    plan: str  # "free" | "monthly" | "yearly" | "lifetime"
    active: bool
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None
    current_period_end: str | None = None
    cancel_at_period_end: bool = False
    total_exercises: int = 0
    exercises_limit: int = 100


# ─── Routes ───

@router.get("/status")
async def get_subscription_status(request: Request):
    """Get the current user's subscription status."""
    user_id = get_user_id_from_request(request)
    sb = get_supabase_admin()
    
    # Get subscription from supabase
    result = sb.table("subscriptions").select("*").eq("user_id", user_id).execute()
    
    # Get total exercises count via agent_instances → exercise_performances
    total_exercises = 0
    try:
        instance_result = sb.table("agent_instances").select("id").eq("user_id", user_id).execute()
        if instance_result.data and len(instance_result.data) > 0:
            agent_id = instance_result.data[0]["id"]
            exercises_result = sb.table("exercise_performances").select("id", count="exact").eq("agent_instance_id", agent_id).execute()
            total_exercises = exercises_result.count or 0
    except Exception as e:
        logger.warning(f"Could not count exercises for user {user_id}: {e}")
    
    if result.data and len(result.data) > 0:
        sub = result.data[0]
        return SubscriptionStatus(
            plan=sub.get("plan", "free"),
            active=sub.get("active", False),
            stripe_customer_id=sub.get("stripe_customer_id"),
            stripe_subscription_id=sub.get("stripe_subscription_id"),
            current_period_end=sub.get("current_period_end"),
            cancel_at_period_end=sub.get("cancel_at_period_end", False),
            total_exercises=total_exercises,
            exercises_limit=100 if sub.get("plan", "free") == "free" else 999999,
        )
    
    return SubscriptionStatus(
        plan="free",
        active=False,
        total_exercises=total_exercises,
        exercises_limit=100,
    )


@router.post("/create-checkout")
async def create_checkout_session(body: CreateCheckoutRequest, request: Request):
    """Create a Stripe checkout session for the selected plan."""
    user_id = get_user_id_from_request(request)
    
    if body.plan not in PRICE_MAP:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    price_id = PRICE_MAP[body.plan]
    if not price_id:
        raise HTTPException(status_code=500, detail="Stripe price not configured")
    
    sb = get_supabase_admin()
    
    # Get or create Stripe customer
    sub_result = sb.table("subscriptions").select("stripe_customer_id").eq("user_id", user_id).execute()
    
    customer_id = None
    if sub_result.data and sub_result.data[0].get("stripe_customer_id"):
        customer_id = sub_result.data[0]["stripe_customer_id"]
    else:
        # Get user email from auth
        user_result = sb.auth.admin.get_user_by_id(user_id)
        email = user_result.user.email if user_result.user else None
        
        customer = stripe.Customer.create(
            email=email,
            metadata={"user_id": user_id},
        )
        customer_id = customer.id
        
        # Upsert subscription record
        sb.table("subscriptions").upsert({
            "user_id": user_id,
            "stripe_customer_id": customer_id,
            "plan": "free",
            "active": False,
        }).execute()
    
    # Choose mode based on plan
    mode = "payment" if body.plan == "lifetime" else "subscription"
    
    frontend_url = settings.frontend_url or "http://localhost:3000"
    
    session_params = {
        "customer": customer_id,
        "mode": mode,
        "success_url": f"{frontend_url}/profile?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{frontend_url}/profile?payment=cancelled",
        "metadata": {
            "user_id": user_id,
            "plan": body.plan,
        },
    }
    
    if mode == "subscription":
        session_params["line_items"] = [{"price": price_id, "quantity": 1}]
    else:
        session_params["line_items"] = [{"price": price_id, "quantity": 1}]
    
    session = stripe.checkout.Session.create(**session_params)
    
    return {"checkout_url": session.url}


@router.get("/verify-session")
async def verify_checkout_session(session_id: str, request: Request):
    """Verify a checkout session after redirect — activates subscription without needing webhooks."""
    user_id = get_user_id_from_request(request)
    
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as e:
        logger.error(f"Session retrieval error: {e}")
        raise HTTPException(status_code=400, detail="Invalid session")
    
    # Verify the session belongs to this user
    if session.metadata.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Session does not belong to this user")
    
    if session.payment_status != "paid":
        return {"status": "pending", "payment_status": session.payment_status}
    
    plan = session.metadata.get("plan")
    customer_id = session.customer
    subscription_id = session.subscription
    
    sb = get_supabase_admin()
    
    update_data = {
        "user_id": user_id,
        "plan": plan,
        "active": True,
        "stripe_customer_id": customer_id,
        "cancel_at_period_end": False,
    }
    
    if subscription_id:
        update_data["stripe_subscription_id"] = subscription_id
        try:
            stripe_sub = stripe.Subscription.retrieve(subscription_id)
            update_data["current_period_end"] = datetime.fromtimestamp(
                stripe_sub.current_period_end
            ).isoformat()
        except Exception:
            pass
    else:
        # Lifetime — no subscription, far-future end
        update_data["current_period_end"] = (
            datetime.utcnow() + timedelta(days=36500)
        ).isoformat()
    
    sb.table("subscriptions").upsert(update_data).execute()
    logger.info(f"Subscription activated via verify-session: user={user_id} plan={plan}")
    
    return {"status": "activated", "plan": plan}


@router.post("/cancel")
async def cancel_subscription(request: Request):
    """Cancel the current subscription (at period end)."""
    user_id = get_user_id_from_request(request)
    sb = get_supabase_admin()
    
    result = sb.table("subscriptions").select("*").eq("user_id", user_id).execute()
    if not result.data or not result.data[0].get("stripe_subscription_id"):
        raise HTTPException(status_code=400, detail="No active subscription")
    
    sub = result.data[0]
    
    try:
        stripe.Subscription.modify(
            sub["stripe_subscription_id"],
            cancel_at_period_end=True,
        )
    except Exception as e:
        logger.error(f"Stripe cancel error: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")
    
    # Update local record
    sb.table("subscriptions").update({
        "cancel_at_period_end": True,
    }).eq("user_id", user_id).execute()
    
    return {"status": "cancelled_at_period_end"}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    webhook_secret = getattr(settings, 'stripe_webhook_secret', '')
    
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.error(f"Webhook signature verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    sb = get_supabase_admin()
    
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        plan = session["metadata"].get("plan")
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")
        
        if user_id and plan:
            update_data = {
                "user_id": user_id,
                "plan": plan,
                "active": True,
                "stripe_customer_id": customer_id,
                "cancel_at_period_end": False,
            }
            
            if subscription_id:
                update_data["stripe_subscription_id"] = subscription_id
                # Get period end from subscription
                try:
                    stripe_sub = stripe.Subscription.retrieve(subscription_id)
                    update_data["current_period_end"] = datetime.fromtimestamp(
                        stripe_sub.current_period_end
                    ).isoformat()
                except Exception:
                    pass
            else:
                # Lifetime — no subscription ID, set a far-future end date
                update_data["current_period_end"] = (
                    datetime.utcnow() + timedelta(days=36500)
                ).isoformat()
            
            sb.table("subscriptions").upsert(update_data).execute()
            logger.info(f"Subscription activated: user={user_id} plan={plan}")
    
    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        customer_id = subscription.get("customer")
        
        # Find user by customer ID
        result = sb.table("subscriptions").select("user_id").eq(
            "stripe_customer_id", customer_id
        ).execute()
        
        if result.data:
            user_id = result.data[0]["user_id"]
            sb.table("subscriptions").update({
                "active": subscription["status"] == "active",
                "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
                "current_period_end": datetime.fromtimestamp(
                    subscription["current_period_end"]
                ).isoformat() if subscription.get("current_period_end") else None,
            }).eq("user_id", user_id).execute()
    
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_id = subscription.get("customer")
        
        result = sb.table("subscriptions").select("user_id").eq(
            "stripe_customer_id", customer_id
        ).execute()
        
        if result.data:
            user_id = result.data[0]["user_id"]
            sb.table("subscriptions").update({
                "plan": "free",
                "active": False,
                "stripe_subscription_id": None,
                "cancel_at_period_end": False,
            }).eq("user_id", user_id).execute()
            logger.info(f"Subscription deleted: user={user_id}")
    
    return JSONResponse(content={"received": True})
