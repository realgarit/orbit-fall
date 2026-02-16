## 2025-05-22 - [Improving Login Page Accessibility and Feedback]
**Learning:** This app's components often use inline styles, which can make it challenging to implement standard CSS pseudo-classes like `:focus` or `:hover`. Using React state (`useState`) coupled with `onFocus`/`onBlur` and `onMouseEnter`/`onMouseLeave` is an effective pattern for adding micro-interactions and accessibility cues in such cases.
**Action:** Always check if a component uses inline styles and apply React-state-driven visual feedback if global CSS classes are not readily available or appropriate for the scope.
