**Summary**

- Purpose: Document what we learned while debugging the Devvit inline `splash` UI and provide a repeatable method to diagnose and fix similar rendering issues in the future.
- Scope: Tailwind/Tailwind utility interactions, flexbox sizing, third-party CSS (NES.css), Devvit inline sizing and the build/deploy flow.

**Root Causes Identified**

- `h-full` and Tailwind utilities can force elements to take 100% of parent height when Devvit provides a fixed inline frame; this often conflicts with the desired 480px visual design.
- Nested `flex` containers combined with `flex-1` without `min-height: 0` or `minHeight: 0` produce unpredictable growth and large empty gaps.
- `min-height` on inner elements (or large `minHeight` values) easily causes overflow inside a fixed-height container — avoid `min-height` on inner elements for inline apps.
- Third-party CSS (NES.css) introduced unexpected padding/margins that altered the layout; mixing many global CSS utilities increases risk.
- Relying on dev-time DOM classes (like `h-full` on html/body/root) can cause the built `dist/` output to still force 100% heights even when the app should be constrained.
- Build artifacts in `dist/` were being served by Devvit; changes to `src/` had no effect until a rebuild was done.

**Concrete Fixes & Rules**

1. Use explicit containment at the app root
   - Make the root container match the Devvit frame by constraining sizes explicitly (preferably in the root React component):
     - `height`/`maxHeight` or `height: 480px` only at the root if the platform requires it.
     - Set `boxSizing: 'border-box'` on containers.
     - `overflow: 'hidden'` on the root to prevent page scroll in the inline frame.

2. Simplify flex usage and avoid nested growth fights
   - Keep flex nesting to a minimum.
   - When using `flex: 1` on children, ensure `minHeight: 0` is set on their flex parent to allow children to shrink properly.
   - Avoid adding `min-height` to inner elements unless absolutely necessary.
   - Use `flexShrink: 0` for fixed-size elements (like a footer) to prevent them compressing or pushing other content.

3. Prefer constrained scroll areas for variable content
   - For lists or option groups that can overflow, wrap them in a container with `maxHeight` and `overflowY: 'auto'` so only that region scrolls.

4. Diagnose visually with a minimal test harness
   - Create a diagnostic page that renders nested boxes (outermost fills frame, inner boxes at 50% sizes). This quickly shows whether the root is filling the frame and whether padding/margins are coming from CSS or the host.
   - Example test pattern used here: a full-size red box, a green box at 50% width/height, blue box at 50% of green, yellow inner box with text. If this renders correctly, basic sizing is correct and the issue is in the original component styles.

5. Beware global utilities and vendor styles
   - Remove or override `h-full` on `html`, `body`, and `#root` if Devvit's inline frame has a strict height — or explicitly set `height` on the app root instead.
   - Audit third-party CSS (NES.css) for padding or box model changes and account for them.

6. Build & Deploy checklist
   - After making style/component changes, always rebuild the client and server bundles and verify `dist/` contains updated files:

```bash
npm run build
# verify dist/client/splash.html and dist/client/splash.js were updated
```

   - Open `dist/client/splash.html` and confirm the output does not reintroduce `h-full` classes or other global height forcing styles.

7. Devvit configuration notes
   - `devvit.json` `post.entrypoints.default.height` affects allocated inline height. Use the correct `height` (`regular`, `tall`, etc.) for expected frame size.
   - Do NOT rely on temporarily changing the `height` setting to "fix" a layout problem; fix the internal layout instead.

**Debugging Steps (repeatable)**

1. Reproduce the issue in Devvit (observe black gap or overflow).
2. Build a minimal diagnostic page (nested boxes) and deploy to confirm the platform's allocated frame size and any host padding.
3. Inspect `dist/client/splash.html` to ensure `html/body/#root` do not have `h-full` or other full-height utility classes that force 100% height.
4. In React root, set a constrained style and `overflow: hidden` to guarantee the frame boundary is respected.
5. Replace complex utility-driven layout with explicit inline or scoped styles to validate sizing. Once verified, gradually reintroduce utilities.
6. Ensure scrollable regions are constrained with `maxHeight` + `overflowY: auto` rather than allowing inner content to expand the host frame.
7. Rebuild (`npm run build`) and verify visually in Devvit. Use the diagnostic harness to confirm success.

**Quick Remediation Checklist**

- [ ] Remove `h-full` from `html`, `body`, and `#root` when debugging sizing issues in a fixed host frame.
- [ ] Add `minHeight: 0` on flex parents that contain `flex: 1` children.
- [ ] Avoid `min-height` on inner elements inside a fixed-height root.
- [ ] Constrain scrolling regions with `maxHeight` + `overflowY: auto`.
- [ ] Rebuild and confirm `dist/` is updated before testing on Devvit.

**Example snippets**

- Ensure flex parent allows shrinking:

```css
/* parent */
.parent { display:flex; flex-direction:column; min-height:0; }
.child { flex:1; overflow:hidden; }
```

- Constrain a scrollable option list in React inline style:

```js
<div style={{ maxHeight: 180, overflowY: 'auto' }}>
  {/* long list here */}
</div>
```

**When to escalate**

- If the diagnostic harness (nested boxes) renders correctly but your app still shows gaps, the problem is with specific component styles or third-party CSS; audit those styles.
- If `dist/` is not updating after build, check your build pipeline and outDir settings.

---

This document should be kept with the project root as `learnings.md` so future contributors can quickly follow a repeatable method to debug inline Devvit UI sizing problems.