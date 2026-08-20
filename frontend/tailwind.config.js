/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sp: {
  				primary: 'var(--color-primary)',
  				'primary-hover': 'var(--color-primary-hover)',
  				'primary-active': 'var(--color-primary-active)',
  				'primary-subtle': 'var(--color-primary-subtle)',
  				'primary-muted': 'var(--color-primary-muted)',
  				background: 'var(--color-background)',
  				'background-secondary': 'var(--color-background-secondary)',
  				surface: 'var(--color-surface)',
  				'surface-hover': 'var(--color-surface-hover)',
  				'surface-active': 'var(--color-surface-active)',
  				'surface-elevated': 'var(--color-surface-elevated)',
  				'text-primary': 'var(--color-text-primary)',
  				'text-secondary': 'var(--color-text-secondary)',
  				'text-tertiary': 'var(--color-text-tertiary)',
  				'text-disabled': 'var(--color-text-disabled)',
  				'text-on-primary': 'var(--color-text-on-primary)',
  				'icon-primary': 'var(--color-icon-primary)',
  				'icon-secondary': 'var(--color-icon-secondary)',
  				'icon-primary-action': 'var(--color-icon-primary-action)',
  				border: 'var(--color-border)',
  				'border-subtle': 'var(--color-border-subtle)',
  				'border-strong': 'var(--color-border-strong)',
  				separator: 'var(--color-separator)',
  				'search-background': 'var(--color-search-background)',
  				'search-text': 'var(--color-search-text)',
  				'search-placeholder': 'var(--color-search-placeholder)',
  				'search-icon': 'var(--color-search-icon)',
  				'search-focus': 'var(--color-search-focus)',
  				'card-background': 'var(--color-card-background)',
  				'card-background-hover': 'var(--color-card-background-hover)',
  				'card-border': 'var(--color-card-border)',
  				'nav-background': 'var(--color-nav-background)',
  				'nav-active': 'var(--color-nav-active)',
  				'nav-inactive': 'var(--color-nav-inactive)',
  				'nav-border': 'var(--color-nav-border)',
  				'fab-background': 'var(--color-fab-background)',
  				'fab-background-hover': 'var(--color-fab-background-hover)',
  				'fab-icon': 'var(--color-fab-icon)',
  				overlay: 'var(--color-overlay)'
  			}
  		},
  		boxShadow: {
  			'sp-card': '0 1px 2px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.18)',
  			'sp-floating': '0 4px 16px rgba(0, 0, 0, 0.35)',
  			'sp-primary': '0 4px 16px rgba(48, 209, 88, 0.18)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

