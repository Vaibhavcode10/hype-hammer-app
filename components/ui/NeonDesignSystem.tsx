import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// NEON DESIGN SYSTEM COMPONENTS
// Gaming-style neon auction design system with glassmorphism and pink/red accents
// ═══════════════════════════════════════════════════════════════════════════════

// ─── CSS Keyframes (inject once) ───────────────────────────────────────────────
export const NeonDesignStyles: React.FC = () => (
  <style>{`
    @keyframes neon-pulse {
      0%, 100% { box-shadow: 0 0 10px rgba(255, 0, 102, 0.5), 0 0 30px rgba(255, 0, 102, 0.25), 0 0 60px rgba(255, 0, 102, 0.1); }
      50% { box-shadow: 0 0 20px rgba(255, 0, 102, 0.7), 0 0 50px rgba(255, 0, 102, 0.4), 0 0 90px rgba(255, 0, 102, 0.18); }
    }
    @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes pulse-glow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.9; } }
    @keyframes bg-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    @keyframes hud-blink { 0%, 90%, 100% { opacity: 1; } 95% { opacity: 0.2; } }
    @keyframes neon-border-pulse { 0%, 100% { border-color: rgba(255, 0, 102, 0.15); } 50% { border-color: rgba(255, 0, 102, 0.65); } }
    @keyframes light-sweep {
      0% { transform: translateX(-100%) skewX(-15deg); }
      100% { transform: translateX(300%) skewX(-15deg); }
    }
    @keyframes live-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.7; }
    }
    @keyframes gradient-shift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes cardReveal {
      0% { opacity: 0; transform: translateY(20px) scale(0.95); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes progressLine {
      0% { width: 0%; }
      100% { width: 100%; }
    }
    @keyframes neonBlink {
      0%, 100% { opacity: 1; text-shadow: 0 0 12px #ff2d55, 0 0 24px #ff2d55, 0 0 36px #ff0066; }
      50% { opacity: 0.85; text-shadow: 0 0 4px #ff2d55, 0 0 8px #ff0066; }
    }
    @keyframes textFadeIn {
      0% { opacity: 0; transform: translateY(10px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes cardTilt {
      0%, 100% { transform: perspective(1000px) rotateY(0deg) rotateX(0deg); }
      50% { transform: perspective(1000px) rotateY(2deg) rotateX(1deg); }
    }
    @keyframes cardLift {
      0% { transform: translateY(0) scale(1); }
      100% { transform: translateY(-8px) scale(1.02); }
    }

    .neon-pulse { animation: neon-pulse 2s ease-in-out infinite; }
    .float { animation: float 6s ease-in-out infinite; }
    .shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); background-size: 200% 100%; animation: shimmer 3s infinite; }
    .animated-bg { background-size: 400% 400%; animation: bg-shift 15s ease infinite; }
    .live-pulse { animation: live-pulse 1.5s ease-in-out infinite; }
    .card-reveal { animation: cardReveal 0.5s ease-out forwards; }
    
    /* Gaming Neon Effects */
    .neon-heading {
      background: linear-gradient(135deg, #ff0066 0%, #ff6699 50%, #ff0066 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      background-size: 200% 200%;
      animation: gradient-shift 3s ease infinite;
      text-shadow: 0 0 20px rgba(255, 0, 102, 0.5);
    }
    .neon-text-crisp {
      color: #ff0066;
      text-shadow: 
        0 0 2px rgba(255, 0, 102, 0.9),
        0 0 4px rgba(255, 0, 102, 0.5),
        0 0 8px rgba(255, 0, 102, 0.25);
    }
    .neon-blink {
      animation: neonBlink 2s ease-in-out infinite;
    }
    .text-fade-in {
      animation: textFadeIn 0.8s ease-out forwards;
    }
    
    /* Glass Card Gaming Style */
    .glass-card {
      background: rgba(255, 0, 102, 0.06);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 0, 102, 0.2);
      border-radius: 16px;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .glass-card:hover {
      border-color: rgba(255, 0, 102, 0.6);
      box-shadow: 0 0 30px rgba(255, 0, 102, 0.3), 0 20px 40px rgba(0, 0, 0, 0.3);
      transform: translateY(-8px);
    }
    
    /* Gaming Grid Row */
    .gaming-grid-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
    }
    @media (max-width: 1024px) {
      .gaming-grid-row {
        grid-template-columns: repeat(4, 280px);
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 1rem;
      }
      .gaming-grid-row > * {
        scroll-snap-align: start;
      }
    }
    @media (max-width: 768px) {
      .gaming-grid-row {
        grid-template-columns: repeat(4, 260px);
      }
    }
    
    /* Hero Grid */
    .hero-grid {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      min-height: calc(100vh - 80px);
      gap: 0;
    }
    @media (max-width: 1024px) {
      .hero-grid {
        grid-template-columns: 1fr;
        min-height: auto;
      }
    }
    
    /* Gaming Button Glow */
    .gaming-btn {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .gaming-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 0 30px rgba(255, 0, 102, 0.5), 0 0 60px rgba(255, 0, 102, 0.25);
    }
    
    .neon-bg-dark {
      background: linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 25%, #1a0a12 50%, #0d0d1a 100%);
    }
    .neon-bg-pattern {
      background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 0, 102, 0.03) 2px, rgba(255, 0, 102, 0.03) 4px);
    }
    
    .neon-text-gradient {
      background: linear-gradient(135deg, #ff0066 0%, #ff6699 50%, #ff0066 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      background-size: 200% 200%;
      animation: gradient-shift 3s ease infinite;
    }
    
    .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .custom-scrollbar::-webkit-scrollbar { display: none; }
  `}</style>
);

// ─── TYPES ─────────────────────────────────────────────────────────────────────
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

interface NeonButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

interface LiveBadgeProps {
  status: 'live' | 'upcoming' | 'completed' | 'paused';
  className?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

interface GradientHeadingProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span';
}

interface StatBlockProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

interface NeonInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

interface NeonSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: React.ReactNode;
  options: { value: string; label: string }[];
  error?: string;
}

interface ProgressStepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

interface NeonPageWrapperProps {
  children: React.ReactNode;
  className?: string;
  withPattern?: boolean;
}

// ─── GLASS CARD ────────────────────────────────────────────────────────────────
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hover = true,
  glow = false,
  padding = 'md',
  onClick
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-300 ${paddingClasses[padding]} ${className}`}
      onClick={onClick}
      style={{
        background: 'linear-gradient(135deg, rgba(255, 20, 100, 0.08) 0%, rgba(139, 0, 50, 0.12) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 0, 102, 0.2)',
        boxShadow: glow 
          ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px rgba(255, 0, 102, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        cursor: onClick ? 'pointer' : 'default',
        ...(hover ? {} : {})
      }}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.borderColor = 'rgba(255, 0, 102, 0.4)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 80px rgba(255, 0, 102, 0.15)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.borderColor = 'rgba(255, 0, 102, 0.2)';
          e.currentTarget.style.boxShadow = glow 
            ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px rgba(255, 0, 102, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            : '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {children}
    </div>
  );
};

// ─── NEON BUTTON ───────────────────────────────────────────────────────────────
export const NeonButton: React.FC<NeonButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled = false,
  type = 'button',
  onClick
}) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base'
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.9) 0%, rgba(180, 0, 80, 0.9) 100%)',
          border: 'none',
          color: 'white',
          boxShadow: '0 4px 20px rgba(255, 0, 102, 0.4)'
        };
      case 'secondary':
        return {
          background: 'linear-gradient(135deg, rgba(255, 20, 100, 0.2) 0%, rgba(200, 50, 120, 0.15) 100%)',
          border: '1px solid rgba(255, 0, 102, 0.4)',
          color: '#f472b6',
          boxShadow: '0 0 15px rgba(255, 0, 102, 0.15)'
        };
      case 'outline':
        return {
          background: 'transparent',
          border: '2px solid rgba(255, 0, 102, 0.5)',
          color: '#f472b6',
          boxShadow: 'none'
        };
      case 'ghost':
        return {
          background: 'rgba(255, 0, 102, 0.08)',
          border: '1px solid rgba(255, 0, 102, 0.15)',
          color: '#f9a8d4',
          boxShadow: 'none'
        };
      default:
        return {};
    }
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        rounded-full font-black uppercase tracking-wider
        flex items-center justify-center gap-2
        transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:scale-[1.02] hover:brightness-110
        active:scale-[0.98]
        ${className}
      `}
      style={{
        ...getVariantStyles(),
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </button>
  );
};

// ─── LIVE BADGE ────────────────────────────────────────────────────────────────
export const LiveBadge: React.FC<LiveBadgeProps> = ({
  status,
  className = '',
  size = 'md',
  pulse = true
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs'
  };

  const getStatusStyles = () => {
    switch (status) {
      case 'live':
        return {
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(255, 0, 102, 0.15))',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#fca5a5',
          dotColor: '#ef4444'
        };
      case 'upcoming':
        return {
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.15))',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          color: '#93c5fd',
          dotColor: '#3b82f6'
        };
      case 'completed':
        return {
          background: 'rgba(156, 163, 175, 0.15)',
          border: '1px solid rgba(156, 163, 175, 0.3)',
          color: '#9ca3af',
          dotColor: '#6b7280'
        };
      case 'paused':
        return {
          background: 'rgba(251, 191, 36, 0.15)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          color: '#fcd34d',
          dotColor: '#f59e0b'
        };
      default:
        return {
          background: 'rgba(255, 20, 100, 0.1)',
          border: '1px solid rgba(255, 0, 102, 0.2)',
          color: '#f9a8d4',
          dotColor: '#ec4899'
        };
    }
  };

  const styles = getStatusStyles();
  const statusLabels = {
    live: 'LIVE',
    upcoming: 'UPCOMING',
    completed: 'COMPLETED',
    paused: 'PAUSED'
  };

  return (
    <span
      className={`${sizeClasses[size]} rounded-full font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${className}`}
      style={{
        background: styles.background,
        border: styles.border,
        color: styles.color
      }}
    >
      {(status === 'live' || status === 'paused') && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${pulse && status === 'live' ? 'live-pulse' : ''}`}
          style={{ backgroundColor: styles.dotColor }}
        />
      )}
      {statusLabels[status]}
    </span>
  );
};

// ─── GRADIENT HEADING ──────────────────────────────────────────────────────────
export const GradientHeading: React.FC<GradientHeadingProps> = ({
  children,
  className = '',
  size = 'lg',
  as: Component = 'h2'
}) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
    '2xl': 'text-4xl',
    '3xl': 'text-5xl md:text-6xl'
  };

  return (
    <Component
      className={`${sizeClasses[size]} font-black uppercase tracking-tight neon-text-gradient ${className}`}
    >
      {children}
    </Component>
  );
};

// ─── STAT BLOCK ────────────────────────────────────────────────────────────────
export const StatBlock: React.FC<StatBlockProps> = ({
  label,
  value,
  icon,
  accent = false,
  trend,
  className = ''
}) => {
  return (
    <div
      className={`rounded-xl p-4 transition-all duration-300 ${className}`}
      style={{
        background: accent
          ? 'linear-gradient(135deg, rgba(255, 20, 100, 0.15), rgba(200, 50, 120, 0.1))'
          : 'linear-gradient(135deg, rgba(255, 20, 100, 0.07), rgba(200, 50, 120, 0.04))',
        border: accent ? '1px solid rgba(255, 0, 102, 0.35)' : '1px solid rgba(255, 0, 102, 0.15)',
        borderLeft: `3px solid ${accent ? 'rgba(255, 0, 102, 0.7)' : 'rgba(255, 0, 102, 0.35)'}`
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-pink-400/60">{icon}</span>}
        <p className="text-[11px] text-pink-300/60 uppercase font-bold tracking-wide">{label}</p>
      </div>
      <div className="flex items-center gap-2">
        <p className={`text-xl font-black ${accent ? 'text-pink-300' : 'text-white'}`}>
          {value}
        </p>
        {trend && trend !== 'neutral' && (
          <span className={`text-xs ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── NEON INPUT ────────────────────────────────────────────────────────────────
export const NeonInput: React.FC<NeonInputProps> = ({
  label,
  icon,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-xs font-black uppercase text-pink-300/70 tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/50">
            {icon}
          </span>
        )}
        <input
          {...props}
          className={`
            w-full ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3 rounded-xl
            text-white placeholder-pink-300/40
            outline-none transition-all duration-300
            ${error ? 'border-red-500/50' : ''}
          `}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 20, 100, 0.08), rgba(200, 50, 120, 0.05))',
            border: error ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 0, 102, 0.2)',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
          onFocus={(e) => {
            e.target.style.border = '1px solid rgba(255, 0, 102, 0.5)';
            e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 15px rgba(255, 0, 102, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.border = error ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 0, 102, 0.2)';
            e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.1)';
          }}
        />
      </div>
      {error && (
        <p className="text-xs text-red-400 font-medium">{error}</p>
      )}
    </div>
  );
};

// ─── NEON SELECT ───────────────────────────────────────────────────────────────
export const NeonSelect: React.FC<NeonSelectProps> = ({
  label,
  icon,
  options,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-xs font-black uppercase text-pink-300/70 tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400/50 pointer-events-none">
            {icon}
          </span>
        )}
        <select
          {...props}
          className={`
            w-full ${icon ? 'pl-11' : 'pl-4'} pr-10 py-3 rounded-xl
            text-white appearance-none cursor-pointer
            outline-none transition-all duration-300
            ${error ? 'border-red-500/50' : ''}
          `}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 20, 100, 0.08), rgba(200, 50, 120, 0.05))',
            border: error ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 0, 102, 0.2)',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ background: '#1a0a0a', color: 'white' }}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-400/50 pointer-events-none">
          ▼
        </span>
      </div>
      {error && (
        <p className="text-xs text-red-400 font-medium">{error}</p>
      )}
    </div>
  );
};

// ─── PROGRESS STEPPER ──────────────────────────────────────────────────────────
export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  steps,
  currentStep,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-center gap-0 ${className}`}>
      {steps.map((step, idx) => {
        const isActive = idx === currentStep;
        const isCompleted = idx < currentStep;
        
        return (
          <React.Fragment key={idx}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  font-black text-sm transition-all duration-300
                  ${isActive ? 'neon-pulse' : ''}
                `}
                style={{
                  background: isCompleted
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.2))'
                    : isActive
                    ? 'linear-gradient(135deg, rgba(255, 0, 102, 0.4), rgba(180, 0, 80, 0.3))'
                    : 'rgba(255, 20, 100, 0.1)',
                  border: isCompleted
                    ? '2px solid rgba(34, 197, 94, 0.5)'
                    : isActive
                    ? '2px solid rgba(255, 0, 102, 0.6)'
                    : '1px solid rgba(255, 0, 102, 0.2)',
                  color: isCompleted ? '#4ade80' : isActive ? '#f472b6' : '#f9a8d4',
                  boxShadow: isActive ? '0 0 20px rgba(255, 0, 102, 0.4)' : 'none'
                }}
              >
                {isCompleted ? '✓' : idx + 1}
              </div>
              <span
                className={`text-[10px] uppercase font-bold tracking-wide ${
                  isActive ? 'text-pink-300' : isCompleted ? 'text-green-400/70' : 'text-pink-300/40'
                }`}
              >
                {step}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className="w-16 h-0.5 mx-2 -mt-6"
                style={{
                  background: isCompleted
                    ? 'linear-gradient(90deg, rgba(34, 197, 94, 0.5), rgba(34, 197, 94, 0.5))'
                    : 'linear-gradient(90deg, rgba(255, 0, 102, 0.2), rgba(255, 0, 102, 0.1))'
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── NEON PAGE WRAPPER ─────────────────────────────────────────────────────────
export const NeonPageWrapper: React.FC<NeonPageWrapperProps> = ({
  children,
  className = '',
  withPattern = true
}) => {
  return (
    <div
      className={`min-h-screen relative overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 25%, #1a0a12 50%, #0d0d1a 100%)'
      }}
    >
      {/* Background Pattern */}
      {withPattern && (
        <div
          className="absolute inset-0 opacity-100 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 0, 102, 0.03) 2px, rgba(255, 0, 102, 0.03) 4px)'
          }}
        />
      )}
      
      {/* Ambient Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

// ─── ROLE SELECTOR PILLS ───────────────────────────────────────────────────────
interface RoleSelectorProps {
  roles: { value: string; label: string; icon?: React.ReactNode }[];
  selected: string;
  onChange: (value: string) => void;
  className?: string;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  roles,
  selected,
  onChange,
  className = ''
}) => {
  return (
    <div
      className={`inline-flex rounded-full p-1.5 ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(255, 20, 100, 0.1), rgba(200, 50, 120, 0.08))',
        border: '1px solid rgba(255, 0, 102, 0.2)'
      }}
    >
      {roles.map((role) => {
        const isActive = selected === role.value;
        return (
          <button
            key={role.value}
            type="button"
            onClick={() => onChange(role.value)}
            className={`
              px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider
              flex items-center gap-2 transition-all duration-300
              ${isActive ? '' : 'hover:bg-white/5'}
            `}
            style={
              isActive
                ? {
                    background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.9), rgba(180, 0, 80, 0.9))',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(255, 0, 102, 0.4)'
                  }
                : {
                    background: 'transparent',
                    color: '#f9a8d4'
                  }
            }
          >
            {role.icon}
            {role.label}
          </button>
        );
      })}
    </div>
  );
};

// ─── SEARCH BAR ────────────────────────────────────────────────────────────────
interface NeonSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const NeonSearchBar: React.FC<NeonSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = ''
}) => {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-400/50"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-4 rounded-xl text-white placeholder-pink-300/40 outline-none transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 20, 100, 0.08), rgba(200, 50, 120, 0.05))',
          border: '1px solid rgba(255, 0, 102, 0.2)',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
        onFocus={(e) => {
          e.target.style.border = '1px solid rgba(255, 0, 102, 0.5)';
          e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 20px rgba(255, 0, 102, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.border = '1px solid rgba(255, 0, 102, 0.2)';
          e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.1)';
        }}
      />
    </div>
  );
};

// ─── FILTER PILL ───────────────────────────────────────────────────────────────
interface FilterPillProps {
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const FilterPill: React.FC<FilterPillProps> = ({
  label,
  count,
  active = false,
  onClick,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 ${className}`}
      style={
        active
          ? {
              background: 'linear-gradient(135deg, rgba(255, 0, 102, 0.9), rgba(180, 0, 80, 0.9))',
              color: 'white',
              boxShadow: '0 4px 20px rgba(255, 0, 102, 0.4)'
            }
          : {
              background: 'linear-gradient(135deg, rgba(255, 20, 100, 0.08), rgba(200, 50, 120, 0.05))',
              border: '1px solid rgba(255, 0, 102, 0.2)',
              color: '#f9a8d4'
            }
      }
    >
      {label} {count !== undefined && `(${count})`}
    </button>
  );
};

// Export all components
export default {
  NeonDesignStyles,
  GlassCard,
  NeonButton,
  LiveBadge,
  GradientHeading,
  StatBlock,
  NeonInput,
  NeonSelect,
  ProgressStepper,
  NeonPageWrapper,
  RoleSelector,
  NeonSearchBar,
  FilterPill
};
