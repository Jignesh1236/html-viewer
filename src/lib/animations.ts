export interface AnimationPreset {
  name: string;
  category: string;
  keyframes: string;
  defaultDuration: number;
  defaultEasing: string;
  defaultIteration?: string;
  description: string;
}

export const ANIMATION_CATEGORIES = [
  'Fade', 'Slide', 'Zoom', 'Rotate', 'Bounce', 'Attention', 'Special',
] as const;

export const ANIMATION_PRESETS: AnimationPreset[] = [
  // ── Fade ────────────────────────────────────────────────
  { name: 'fadeIn', category: 'Fade', defaultDuration: 0.6, defaultEasing: 'ease', description: 'Smooth opacity 0 → 1.',
    keyframes: '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }' },
  { name: 'fadeOut', category: 'Fade', defaultDuration: 0.6, defaultEasing: 'ease', description: 'Smooth opacity 1 → 0.',
    keyframes: '@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }' },
  { name: 'fadeInUp', category: 'Fade', defaultDuration: 0.7, defaultEasing: 'ease-out', description: 'Fade in while rising up.',
    keyframes: '@keyframes fadeInUp { from { opacity: 0; transform: translate3d(0, 40px, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }' },
  { name: 'fadeInDown', category: 'Fade', defaultDuration: 0.7, defaultEasing: 'ease-out', description: 'Fade in dropping down.',
    keyframes: '@keyframes fadeInDown { from { opacity: 0; transform: translate3d(0, -40px, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }' },
  { name: 'fadeInLeft', category: 'Fade', defaultDuration: 0.7, defaultEasing: 'ease-out', description: 'Fade in from left.',
    keyframes: '@keyframes fadeInLeft { from { opacity: 0; transform: translate3d(-50px, 0, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }' },
  { name: 'fadeInRight', category: 'Fade', defaultDuration: 0.7, defaultEasing: 'ease-out', description: 'Fade in from right.',
    keyframes: '@keyframes fadeInRight { from { opacity: 0; transform: translate3d(50px, 0, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }' },
  { name: 'fadeOutUp', category: 'Fade', defaultDuration: 0.7, defaultEasing: 'ease-in', description: 'Fade out floating up.',
    keyframes: '@keyframes fadeOutUp { from { opacity: 1; transform: translate3d(0, 0, 0); } to { opacity: 0; transform: translate3d(0, -40px, 0); } }' },
  { name: 'fadeOutDown', category: 'Fade', defaultDuration: 0.7, defaultEasing: 'ease-in', description: 'Fade out dropping down.',
    keyframes: '@keyframes fadeOutDown { from { opacity: 1; transform: translate3d(0, 0, 0); } to { opacity: 0; transform: translate3d(0, 40px, 0); } }' },

  // ── Slide ───────────────────────────────────────────────
  { name: 'slideUp', category: 'Slide', defaultDuration: 0.6, defaultEasing: 'ease-out', description: 'Slide in from below.',
    keyframes: '@keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }' },
  { name: 'slideDown', category: 'Slide', defaultDuration: 0.6, defaultEasing: 'ease-out', description: 'Slide in from above.',
    keyframes: '@keyframes slideDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }' },
  { name: 'slideLeft', category: 'Slide', defaultDuration: 0.6, defaultEasing: 'ease-out', description: 'Slide in from the right edge.',
    keyframes: '@keyframes slideLeft { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }' },
  { name: 'slideRight', category: 'Slide', defaultDuration: 0.6, defaultEasing: 'ease-out', description: 'Slide in from the left edge.',
    keyframes: '@keyframes slideRight { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }' },
  { name: 'slideInUpBig', category: 'Slide', defaultDuration: 0.8, defaultEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)', description: 'Big slide from below the viewport.',
    keyframes: '@keyframes slideInUpBig { from { opacity: 0; transform: translate3d(0, 100%, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }' },
  { name: 'slideInDownBig', category: 'Slide', defaultDuration: 0.8, defaultEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)', description: 'Big slide from above the viewport.',
    keyframes: '@keyframes slideInDownBig { from { opacity: 0; transform: translate3d(0, -100%, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }' },
  { name: 'slideInLeftBig', category: 'Slide', defaultDuration: 0.8, defaultEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)', description: 'Big slide from far right.',
    keyframes: '@keyframes slideInLeftBig { from { opacity: 0; transform: translate3d(100%, 0, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }' },
  { name: 'slideInRightBig', category: 'Slide', defaultDuration: 0.8, defaultEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)', description: 'Big slide from far left.',
    keyframes: '@keyframes slideInRightBig { from { opacity: 0; transform: translate3d(-100%, 0, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }' },

  // ── Zoom ────────────────────────────────────────────────
  { name: 'zoom', category: 'Zoom', defaultDuration: 0.5, defaultEasing: 'ease-out', description: 'Soft zoom-in with fade.',
    keyframes: '@keyframes zoom { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }' },
  { name: 'zoomIn', category: 'Zoom', defaultDuration: 0.6, defaultEasing: 'ease-out', description: 'Standard zoom-in.',
    keyframes: '@keyframes zoomIn { from { opacity: 0; transform: scale3d(0.3, 0.3, 0.3); } 50% { opacity: 1; } to { transform: scale3d(1, 1, 1); } }' },
  { name: 'zoomOut', category: 'Zoom', defaultDuration: 0.6, defaultEasing: 'ease-in', description: 'Standard zoom-out.',
    keyframes: '@keyframes zoomOut { from { opacity: 1; } 50% { opacity: 0; transform: scale3d(0.3, 0.3, 0.3); } to { opacity: 0; } }' },
  { name: 'zoomInUp', category: 'Zoom', defaultDuration: 0.8, defaultEasing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', description: 'Zoom in from below.',
    keyframes: '@keyframes zoomInUp { from { opacity: 0; transform: scale(0.1) translate3d(0, 1000px, 0); } 60% { opacity: 1; transform: scale(0.475) translate3d(0, -60px, 0); } to { transform: scale(1) translate3d(0, 0, 0); } }' },
  { name: 'zoomInDown', category: 'Zoom', defaultDuration: 0.8, defaultEasing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', description: 'Zoom in from above.',
    keyframes: '@keyframes zoomInDown { from { opacity: 0; transform: scale(0.1) translate3d(0, -1000px, 0); } 60% { opacity: 1; transform: scale(0.475) translate3d(0, 60px, 0); } to { transform: scale(1) translate3d(0, 0, 0); } }' },
  { name: 'zoomInLeft', category: 'Zoom', defaultDuration: 0.8, defaultEasing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', description: 'Zoom in from right side.',
    keyframes: '@keyframes zoomInLeft { from { opacity: 0; transform: scale(0.1) translate3d(1000px, 0, 0); } 60% { opacity: 1; transform: scale(0.475) translate3d(-30px, 0, 0); } to { transform: scale(1) translate3d(0, 0, 0); } }' },
  { name: 'zoomInRight', category: 'Zoom', defaultDuration: 0.8, defaultEasing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', description: 'Zoom in from left side.',
    keyframes: '@keyframes zoomInRight { from { opacity: 0; transform: scale(0.1) translate3d(-1000px, 0, 0); } 60% { opacity: 1; transform: scale(0.475) translate3d(30px, 0, 0); } to { transform: scale(1) translate3d(0, 0, 0); } }' },

  // ── Rotate ──────────────────────────────────────────────
  { name: 'spin', category: 'Rotate', defaultDuration: 1.2, defaultEasing: 'linear', defaultIteration: 'infinite', description: 'Continuous full spin.',
    keyframes: '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }' },
  { name: 'spinReverse', category: 'Rotate', defaultDuration: 1.2, defaultEasing: 'linear', defaultIteration: 'infinite', description: 'Continuous reverse spin.',
    keyframes: '@keyframes spinReverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }' },
  { name: 'rotateIn', category: 'Rotate', defaultDuration: 0.7, defaultEasing: 'ease-out', description: 'Rotate in from -200°.',
    keyframes: '@keyframes rotateIn { from { opacity: 0; transform-origin: center; transform: rotate3d(0, 0, 1, -200deg); } to { opacity: 1; transform: translate3d(0, 0, 0); } }' },
  { name: 'rotateInUpLeft', category: 'Rotate', defaultDuration: 0.8, defaultEasing: 'ease-out', description: 'Rotate in pivoting from bottom-left.',
    keyframes: '@keyframes rotateInUpLeft { from { opacity: 0; transform-origin: left bottom; transform: rotate3d(0, 0, 1, 45deg); } to { opacity: 1; transform-origin: left bottom; transform: translate3d(0, 0, 0); } }' },
  { name: 'rotateInDownRight', category: 'Rotate', defaultDuration: 0.8, defaultEasing: 'ease-out', description: 'Rotate in pivoting from top-right.',
    keyframes: '@keyframes rotateInDownRight { from { opacity: 0; transform-origin: right top; transform: rotate3d(0, 0, 1, -45deg); } to { opacity: 1; transform-origin: right top; transform: translate3d(0, 0, 0); } }' },
  { name: 'flip', category: 'Rotate', defaultDuration: 0.7, defaultEasing: 'ease-out', description: 'Flip from -90° X.',
    keyframes: '@keyframes flip { from { opacity: 0; transform: perspective(400px) rotateX(-90deg); } to { opacity: 1; transform: perspective(400px) rotateX(0); } }' },
  { name: 'flipInX', category: 'Rotate', defaultDuration: 0.8, defaultEasing: 'ease-in', description: 'Flip in on the X axis.',
    keyframes: '@keyframes flipInX { from { opacity: 0; transform: perspective(400px) rotate3d(1, 0, 0, 90deg); animation-timing-function: ease-in; } 40% { transform: perspective(400px) rotate3d(1, 0, 0, -20deg); animation-timing-function: ease-in; } 60% { opacity: 1; transform: perspective(400px) rotate3d(1, 0, 0, 10deg); } 80% { transform: perspective(400px) rotate3d(1, 0, 0, -5deg); } to { transform: perspective(400px); } }' },
  { name: 'flipInY', category: 'Rotate', defaultDuration: 0.8, defaultEasing: 'ease-in', description: 'Flip in on the Y axis.',
    keyframes: '@keyframes flipInY { from { opacity: 0; transform: perspective(400px) rotate3d(0, 1, 0, 90deg); animation-timing-function: ease-in; } 40% { transform: perspective(400px) rotate3d(0, 1, 0, -20deg); animation-timing-function: ease-in; } 60% { opacity: 1; transform: perspective(400px) rotate3d(0, 1, 0, 10deg); } 80% { transform: perspective(400px) rotate3d(0, 1, 0, -5deg); } to { transform: perspective(400px); } }' },

  // ── Bounce ──────────────────────────────────────────────
  { name: 'bounce', category: 'Bounce', defaultDuration: 1, defaultEasing: 'ease', defaultIteration: 'infinite', description: 'Bouncing ball loop.',
    keyframes: '@keyframes bounce { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-20px); } 60% { transform: translateY(-10px); } }' },
  { name: 'bounceIn', category: 'Bounce', defaultDuration: 0.75, defaultEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)', description: 'Springy entrance.',
    keyframes: '@keyframes bounceIn { 0%, 20%, 40%, 60%, 80%, to { animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); } 0% { opacity: 0; transform: scale3d(0.3, 0.3, 0.3); } 20% { transform: scale3d(1.1, 1.1, 1.1); } 40% { transform: scale3d(0.9, 0.9, 0.9); } 60% { opacity: 1; transform: scale3d(1.03, 1.03, 1.03); } 80% { transform: scale3d(0.97, 0.97, 0.97); } to { opacity: 1; transform: scale3d(1, 1, 1); } }' },
  { name: 'bounceInUp', category: 'Bounce', defaultDuration: 0.85, defaultEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)', description: 'Bounces up into place.',
    keyframes: '@keyframes bounceInUp { 0%, 60%, 75%, 90%, to { animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); } 0% { opacity: 0; transform: translate3d(0, 3000px, 0); } 60% { opacity: 1; transform: translate3d(0, -20px, 0); } 75% { transform: translate3d(0, 10px, 0); } 90% { transform: translate3d(0, -5px, 0); } to { transform: translate3d(0, 0, 0); } }' },
  { name: 'bounceInDown', category: 'Bounce', defaultDuration: 0.85, defaultEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)', description: 'Bounces down into place.',
    keyframes: '@keyframes bounceInDown { 0%, 60%, 75%, 90%, to { animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); } 0% { opacity: 0; transform: translate3d(0, -3000px, 0); } 60% { opacity: 1; transform: translate3d(0, 25px, 0); } 75% { transform: translate3d(0, -10px, 0); } 90% { transform: translate3d(0, 5px, 0); } to { transform: translate3d(0, 0, 0); } }' },
  { name: 'bounceInLeft', category: 'Bounce', defaultDuration: 0.85, defaultEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)', description: 'Bounces in from the left.',
    keyframes: '@keyframes bounceInLeft { 0%, 60%, 75%, 90%, to { animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); } 0% { opacity: 0; transform: translate3d(-3000px, 0, 0); } 60% { opacity: 1; transform: translate3d(25px, 0, 0); } 75% { transform: translate3d(-10px, 0, 0); } 90% { transform: translate3d(5px, 0, 0); } to { transform: translate3d(0, 0, 0); } }' },
  { name: 'bounceInRight', category: 'Bounce', defaultDuration: 0.85, defaultEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)', description: 'Bounces in from the right.',
    keyframes: '@keyframes bounceInRight { 0%, 60%, 75%, 90%, to { animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); } 0% { opacity: 0; transform: translate3d(3000px, 0, 0); } 60% { opacity: 1; transform: translate3d(-25px, 0, 0); } 75% { transform: translate3d(10px, 0, 0); } 90% { transform: translate3d(-5px, 0, 0); } to { transform: translate3d(0, 0, 0); } }' },

  // ── Attention seekers ───────────────────────────────────
  { name: 'pulse', category: 'Attention', defaultDuration: 1.5, defaultEasing: 'ease-in-out', defaultIteration: 'infinite', description: 'Soft scaling pulse.',
    keyframes: '@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }' },
  { name: 'shake', category: 'Attention', defaultDuration: 0.5, defaultEasing: 'ease', description: 'Horizontal shake.',
    keyframes: '@keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }' },
  { name: 'shakeY', category: 'Attention', defaultDuration: 0.5, defaultEasing: 'ease', description: 'Vertical shake.',
    keyframes: '@keyframes shakeY { 0%, 100% { transform: translateY(0); } 20% { transform: translateY(-8px); } 40% { transform: translateY(8px); } 60% { transform: translateY(-6px); } 80% { transform: translateY(6px); } }' },
  { name: 'wobble', category: 'Attention', defaultDuration: 1, defaultEasing: 'ease', description: 'Drunken wobble.',
    keyframes: '@keyframes wobble { 0% { transform: translate3d(0, 0, 0); } 15% { transform: translate3d(-25%, 0, 0) rotate3d(0, 0, 1, -5deg); } 30% { transform: translate3d(20%, 0, 0) rotate3d(0, 0, 1, 3deg); } 45% { transform: translate3d(-15%, 0, 0) rotate3d(0, 0, 1, -3deg); } 60% { transform: translate3d(10%, 0, 0) rotate3d(0, 0, 1, 2deg); } 75% { transform: translate3d(-5%, 0, 0) rotate3d(0, 0, 1, -1deg); } to { transform: translate3d(0, 0, 0); } }' },
  { name: 'jello', category: 'Attention', defaultDuration: 1, defaultEasing: 'ease', description: 'Jello-like skew shake.',
    keyframes: '@keyframes jello { 0%, 11.1%, 100% { transform: translate3d(0, 0, 0); } 22.2% { transform: skewX(-12.5deg) skewY(-12.5deg); } 33.3% { transform: skewX(6.25deg) skewY(6.25deg); } 44.4% { transform: skewX(-3.125deg) skewY(-3.125deg); } 55.5% { transform: skewX(1.5625deg) skewY(1.5625deg); } 66.6% { transform: skewX(-0.78125deg) skewY(-0.78125deg); } 77.7% { transform: skewX(0.390625deg) skewY(0.390625deg); } 88.8% { transform: skewX(-0.1953125deg) skewY(-0.1953125deg); } }' },
  { name: 'rubberBand', category: 'Attention', defaultDuration: 1, defaultEasing: 'ease', description: 'Stretch like rubber.',
    keyframes: '@keyframes rubberBand { 0% { transform: scale3d(1, 1, 1); } 30% { transform: scale3d(1.25, 0.75, 1); } 40% { transform: scale3d(0.75, 1.25, 1); } 50% { transform: scale3d(1.15, 0.85, 1); } 65% { transform: scale3d(0.95, 1.05, 1); } 75% { transform: scale3d(1.05, 0.95, 1); } to { transform: scale3d(1, 1, 1); } }' },
  { name: 'swing', category: 'Attention', defaultDuration: 1, defaultEasing: 'ease', description: 'Pendulum swing.',
    keyframes: '@keyframes swing { 20% { transform: rotate3d(0, 0, 1, 15deg); } 40% { transform: rotate3d(0, 0, 1, -10deg); } 60% { transform: rotate3d(0, 0, 1, 5deg); } 80% { transform: rotate3d(0, 0, 1, -5deg); } to { transform: rotate3d(0, 0, 1, 0deg); } }' },
  { name: 'tada', category: 'Attention', defaultDuration: 1, defaultEasing: 'ease', description: 'Tada celebration.',
    keyframes: '@keyframes tada { 0% { transform: scale3d(1, 1, 1); } 10%, 20% { transform: scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg); } 30%, 50%, 70%, 90% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg); } 40%, 60%, 80% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg); } to { transform: scale3d(1, 1, 1); } }' },
  { name: 'heartBeat', category: 'Attention', defaultDuration: 1.3, defaultEasing: 'ease-in-out', defaultIteration: 'infinite', description: 'Heartbeat rhythm.',
    keyframes: '@keyframes heartBeat { 0% { transform: scale(1); } 14% { transform: scale(1.3); } 28% { transform: scale(1); } 42% { transform: scale(1.3); } 70% { transform: scale(1); } }' },
  { name: 'flash', category: 'Attention', defaultDuration: 1, defaultEasing: 'ease', description: 'Flickering flash.',
    keyframes: '@keyframes flash { 0%, 50%, to { opacity: 1; } 25%, 75% { opacity: 0; } }' },
  { name: 'headShake', category: 'Attention', defaultDuration: 0.7, defaultEasing: 'ease-in-out', description: '"No" head shake.',
    keyframes: '@keyframes headShake { 0% { transform: translateX(0); } 6.5% { transform: translateX(-6px) rotateY(-9deg); } 18.5% { transform: translateX(5px) rotateY(7deg); } 31.5% { transform: translateX(-3px) rotateY(-5deg); } 43.5% { transform: translateX(2px) rotateY(3deg); } 50% { transform: translateX(0); } }' },

  // ── Special / FX ────────────────────────────────────────
  { name: 'roll', category: 'Special', defaultDuration: 0.8, defaultEasing: 'ease-out', description: 'Rolls in from the left.',
    keyframes: '@keyframes roll { from { opacity: 0; transform: translate3d(-100%, 0, 0) rotate3d(0, 0, 1, -120deg); } to { opacity: 1; transform: translate3d(0, 0, 0); } }' },
  { name: 'lightSpeedIn', category: 'Special', defaultDuration: 1, defaultEasing: 'ease-out', description: 'Skewed light-speed entrance.',
    keyframes: '@keyframes lightSpeedIn { from { opacity: 0; transform: translate3d(100%, 0, 0) skewX(-30deg); } 60% { opacity: 1; transform: skewX(20deg); } 80% { transform: skewX(-5deg); } to { transform: translate3d(0, 0, 0); } }' },
  { name: 'jackInTheBox', category: 'Special', defaultDuration: 0.8, defaultEasing: 'ease-out', description: 'Pop out from a box.',
    keyframes: '@keyframes jackInTheBox { from { opacity: 0; transform: scale(0.1) rotate(30deg); transform-origin: center bottom; } 50% { transform: rotate(-10deg); } 70% { transform: rotate(3deg); } to { opacity: 1; transform: scale(1); } }' },
  { name: 'hinge', category: 'Special', defaultDuration: 2, defaultEasing: 'ease-in-out', description: 'Falls off like a broken hinge.',
    keyframes: '@keyframes hinge { 0% { transform-origin: top left; animation-timing-function: ease-in-out; } 20%, 60% { transform: rotate3d(0, 0, 1, 80deg); transform-origin: top left; animation-timing-function: ease-in-out; } 40%, 80% { transform: rotate3d(0, 0, 1, 60deg); transform-origin: top left; opacity: 1; animation-timing-function: ease-in-out; } to { opacity: 0; transform: translate3d(0, 700px, 0); } }' },
  { name: 'glow', category: 'Special', defaultDuration: 2, defaultEasing: 'ease-in-out', defaultIteration: 'infinite', description: 'Soft glow shadow pulse.',
    keyframes: '@keyframes glow { 0%, 100% { box-shadow: 0 0 4px rgba(229,164,90,0.3); } 50% { box-shadow: 0 0 24px rgba(229,164,90,0.9); } }' },
  { name: 'blink', category: 'Special', defaultDuration: 1, defaultEasing: 'steps(2)', defaultIteration: 'infinite', description: 'Hard blink (steps).',
    keyframes: '@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }' },
  { name: 'typewriter', category: 'Special', defaultDuration: 2.5, defaultEasing: 'steps(30, end)', description: 'Typewriter reveal (set width: 0; overflow: hidden; white-space: nowrap on element).',
    keyframes: '@keyframes typewriter { from { width: 0; } to { width: 100%; } }' },
  { name: 'float', category: 'Special', defaultDuration: 3, defaultEasing: 'ease-in-out', defaultIteration: 'infinite', description: 'Gentle floating loop.',
    keyframes: '@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }' },
  { name: 'breathe', category: 'Special', defaultDuration: 4, defaultEasing: 'ease-in-out', defaultIteration: 'infinite', description: 'Slow breathing scale.',
    keyframes: '@keyframes breathe { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.04); opacity: 1; } }' },
  { name: 'gradientShift', category: 'Special', defaultDuration: 6, defaultEasing: 'ease', defaultIteration: 'infinite', description: 'Animated gradient (set background-size: 200% 200%).',
    keyframes: '@keyframes gradientShift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }' },
  { name: 'rainbowText', category: 'Special', defaultDuration: 5, defaultEasing: 'linear', defaultIteration: 'infinite', description: 'Color-cycling text.',
    keyframes: '@keyframes rainbowText { 0% { color: #ff5252; } 16% { color: #ff9800; } 33% { color: #ffeb3b; } 50% { color: #4caf50; } 66% { color: #2196f3; } 83% { color: #673ab7; } 100% { color: #ff5252; } }' },
  { name: 'borderPulse', category: 'Special', defaultDuration: 1.6, defaultEasing: 'ease-out', defaultIteration: 'infinite', description: 'Outward border pulse.',
    keyframes: '@keyframes borderPulse { 0% { box-shadow: 0 0 0 0 rgba(229,164,90,0.5); } 100% { box-shadow: 0 0 0 18px rgba(229,164,90,0); } }' },
  { name: 'wave', category: 'Special', defaultDuration: 2, defaultEasing: 'ease-in-out', defaultIteration: 'infinite', description: 'Waving hand rotation.',
    keyframes: '@keyframes wave { 0%, 100% { transform: rotate(0deg); } 10% { transform: rotate(14deg); } 20% { transform: rotate(-8deg); } 30% { transform: rotate(14deg); } 40% { transform: rotate(-4deg); } 50% { transform: rotate(10deg); } 60% { transform: rotate(0deg); } }' },
];

export const PRESET_BY_NAME: Record<string, AnimationPreset> = ANIMATION_PRESETS.reduce((acc, p) => {
  acc[p.name] = p;
  return acc;
}, {} as Record<string, AnimationPreset>);

export const PRESET_NAMES = ANIMATION_PRESETS.map(p => p.name);

export const KEYFRAMES_MAP: Record<string, string> = ANIMATION_PRESETS.reduce((acc, p) => {
  acc[p.name] = p.keyframes;
  return acc;
}, {} as Record<string, string>);
