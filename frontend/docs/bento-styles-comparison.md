# Bento Box Styles — MathCoach Landing

**Inspiré de PilotBoost** — Deux formats disponibles

---

## Style A — Grid 2x2 avec Visuels

**Quand utiliser :** Features avec stats, graphiques, ou éléments visuels

```
┌─────────────────────┐  ┌─────────────────────┐
│  🎯 Diagnostic IA   │  │  🧠 Adaptatif       │
│                     │  │                     │
│  ✓ Évaluation 5min  │  │  ┌───┬───┬───┐     │
│  ✓ Plan personnalisé│  │  │ 4 │10 │ ∞ │     │
│  ✓ Suivi temps réel │  │  └───┴───┴───┘     │
│                     │  │  types│lvl│exos     │
└─────────────────────┘  └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐
│  💡 Tips contextuels│  │  📊 Analytics       │
│                     │  │                     │
│  ┌─────────────────┐│  │  ┌────────────────┐│
│  │ "Pour 47×8...   ││  │  │ ▃▅▆█ Chart     ││
│  │  décompose"     ││  │  │                ││
│  └─────────────────┘│  │  └────────────────┘│
└─────────────────────┘  └─────────────────────┘
```

**Caractéristiques :**
- Grid 2 colonnes (responsive → 1 col mobile)
- Icône emoji/lucide en haut gauche
- Titre coloré + description
- Contenu visuel : mini-stats, graphiques, examples
- Border hover colorée

**Code pattern :**
```tsx
<div className="grid md:grid-cols-2 gap-6">
  <div className="bg-card rounded-xl p-6 shadow-sm 
                  border-2 border-transparent 
                  hover:border-[#0A6DFF]/20 transition-all">
    
    <div className="flex items-start gap-4 mb-4">
      <div className="w-12 h-12 rounded-xl 
                      bg-gradient-to-br from-[#0A6DFF]/10 to-[#0A6DFF]/5
                      flex items-center justify-center">
        <span className="text-2xl">🎯</span>
      </div>
      <div>
        <h3 className="font-bold text-xl text-[#0A6DFF]">
          Feature Title
        </h3>
        <p className="text-sm text-muted-foreground">
          Description
        </p>
      </div>
    </div>
    
    {/* Visual content: stats/chart/example */}
    
  </div>
</div>
```

---

## Style B — Vertical List (Full Width)

**Quand utiliser :** Process step-by-step, features textuelles, parcours utilisateur

```
┌──────────────────────────────────────────────────────┐
│  Comment ça marche ?                                 │
│  Un parcours structuré pour progresser rapidement    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ✓ Diagnostic initial (5 min)                       │
│    20 questions pour évaluer votre niveau           │
│                                                      │
│  ✓ Plan d'entraînement personnalisé                 │
│    L'algorithme crée un programme adapté            │
│                                                      │
│  ✓ Exercices adaptatifs quotidiens                  │
│    15 minutes par jour avec difficulté ajustée      │
│                                                      │
│  ✓ Tips et corrections instantanées                 │
│    Astuces contextuelles pour progresser            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Caractéristiques :**
- Full-width card (1 colonne)
- Header : titre + description
- Liste verticale avec icons check colorées
- Titre bold + description grise par item
- Parfait pour mobile (pas de grid)

**Code pattern :**
```tsx
<div className="bg-card rounded-xl py-6 shadow-sm 
                border-2 border-transparent 
                hover:border-[#0A6DFF]/20 transition-all">
  
  {/* Header */}
  <div className="px-6 mb-6">
    <h3 className="font-semibold text-2xl mb-2">
      Section Title
    </h3>
    <p className="text-muted-foreground text-sm">
      Subtitle
    </p>
  </div>
  
  {/* List */}
  <div className="px-6 space-y-4">
    
    <div className="flex items-start gap-3">
      <CircleCheck className="w-5 h-5 text-[#0A6DFF] 
                              mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium">Feature Title</p>
        <p className="text-sm text-muted-foreground">
          Description
        </p>
      </div>
    </div>
    
    {/* Repeat for each item */}
    
  </div>
  
</div>
```

---

## Layout Recommandé — Mix des Deux

**Structure :**
1. **Grid 2x2** (4 features principales avec visuels)
2. **Full-width** (process step-by-step)
3. **Info box** (stat clé + CTA)

```
Section Features (py-20)
├─ Header (text-center)
│  ├─ Titre H2
│  └─ Sous-titre
│
├─ Grid 2x2 (gap-6)
│  ├─ Diagnostic IA
│  ├─ Entraînement adaptatif
│  ├─ Tips contextuels
│  └─ Analytics
│
├─ Full-width card (mt-6)
│  └─ Comment ça marche ? (4 steps)
│
└─ Info box (mt-12)
   └─ Stat +35% moyenne
```

---

## Palette de Couleurs par Feature

| Feature | Couleur | Hex | Usage |
|---------|---------|-----|-------|
| **Diagnostic** | Bleu | `#0A6DFF` | Primary brand color |
| **Adaptatif** | Violet | `purple-600` | Tech/algo |
| **Tips** | Orange | `#FF7B00` | Secondary brand |
| **Analytics** | Vert | `green-600` | Success/growth |
| **Step 1** | Bleu | `#0A6DFF` | Start |
| **Step 2** | Violet | `purple-600` | Process |
| **Step 3** | Vert | `green-600` | Action |
| **Step 4** | Orange | `#FF7B00` | Result |

**Gradient cards :**
- Background : `from-[color]/10 to-[color]/5`
- Border hover : `border-[color]/20`
- Text/icon : `text-[color]` (full opacity)

---

## Icons (Lucide React)

**Grid 2x2 :**
- Diagnostic : 🎯 ou `Target`
- Adaptatif : 🧠 ou `Brain`
- Tips : 💡 ou `Lightbulb`
- Analytics : 📊 ou `TrendingUp`

**Vertical list :**
- Toutes les étapes : `CircleCheck` avec couleur différente

**Import :**
```tsx
import { Target, Brain, Lightbulb, TrendingUp, CircleCheck } from 'lucide-react'
```

---

## Responsive Behavior

**Desktop (≥ 768px) :**
- Grid 2x2 : 2 colonnes
- Vertical list : 1 colonne (mais full width)

**Tablet (≥ 640px, < 768px) :**
- Grid 2x2 → 1 colonne (stack)
- Vertical list : inchangé

**Mobile (< 640px) :**
- Tout en stack
- Padding réduit (`px-4` → `px-3`)
- Font sizes plus petits

**TailwindCSS :**
```tsx
className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
className="text-lg sm:text-xl md:text-2xl"
```

---

## Animations (Framer Motion)

**Fade in on scroll :**
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
  viewport={{ once: true }}
>
  {/* Card */}
</motion.div>
```

**Hover scale :**
```tsx
<motion.div
  whileHover={{ scale: 1.02 }}
  transition={{ type: "spring", stiffness: 300 }}
>
  {/* Card */}
</motion.div>
```

**Staggered children :**
```tsx
<motion.div
  variants={{
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }}
  initial="hidden"
  whileInView="show"
  viewport={{ once: true }}
>
  {items.map((item, i) => (
    <motion.div
      key={i}
      variants={{
        hidden: { opacity: 0, x: -20 },
        show: { opacity: 1, x: 0 }
      }}
    >
      {/* List item */}
    </motion.div>
  ))}
</motion.div>
```

---

## Exemples d'Utilisation

### Landing MathCoach

**Section 1 — Hero**
- Background gradient bleu/orange
- CTA principal

**Section 2 — Features**
- Grid 2x2 (Diagnostic, Adaptatif, Tips, Analytics)
- Full-width (Comment ça marche ?)
- Info box (+35% stat)

**Section 3 — Témoignages**
- Grid 1x3 (cards simples)

**Section 4 — CTA Final**
- Background bleu plein
- Bouton blanc

### Page Pricing (future)

**Section Comparaison**
- Grid 1x3 (Free, Pro, Team)
- Style similaire mais vertical

---

## Next Steps

1. ✅ Wireframes validés
2. ⏳ Setup Next.js + TailwindCSS
3. ⏳ Créer composants réutilisables :
   - `<BentoCard />` (grid style)
   - `<BentoList />` (vertical style)
   - `<BentoSection />` (wrapper)
4. ⏳ Implémenter Landing page
5. ⏳ Ajouter animations Framer Motion

---

**Prêt pour l'implémentation !** 🚀
