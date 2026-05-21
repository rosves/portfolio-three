# Portfolio Three.js — Section 3 (Étudiant 3)

Démonstration des **effets visuels** du cours FYC sur Three.js + WebGL.
Couvre les 4 sous-modules du Module 3 :

| Sous-module | Implémentation | Fichier clé |
|---|---|---|
| 3.1 — Systèmes de particules | 3 layers (`dust` 1500, `stars` 80, `accent` 50) en `BufferGeometry` + `Points`, distribution sphérique aplatie | `src/modules/particles.js` |
| 3.2 — Post-processing | `EffectComposer` + `RenderPass` + `UnrealBloomPass` + `OutputPass` | `src/core/renderer.js` |
| 3.3 — Shaders GLSL | `ShaderMaterial` sur le layer accent : vertex shader (déplacement organique sin/cos par offset aléatoire) + fragment shader (disque doux + glow qui nourrit le bloom) | `src/modules/particles.js` |
| 3.4 — Environnement immersif | `Fog` + env map procédurale via `PMREMGenerator` (pas de HDRI externe à télécharger) | `src/modules/particles.js` + `src/core/scene.js` |

## Architecture

Suit le schéma défini dans le brief d'architecture :

```
portfolio-three-main/
├── index.html              
├── standalone.html         
├── package.json
├── vite.config.js
├── public/
│   ├── favicon.svg
│   ├── models/            
│   └── textures/           
└── src/
    ├── main.js            
    ├── core/
    │   ├── renderer.js     
    │   ├── scene.js        
    │   └── sizes.js        
    ├── modules/
    │   └── particles.js    
    ├── ui/                 
    └── styles/
        ├── main.css        
        ├── layout.css      
        ├── modules.css     
        └── loader.css      
```


## Lancer le projet

### Mode normal (Vite)
```bash
npm install
npm run dev      # http://localhost:5173

```


Section 3 · Étudiant 3 · Cours FYC ESGI · 2026