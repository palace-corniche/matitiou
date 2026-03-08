import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				'money-green': 'hsl(var(--money-green))',
				'money-gold': 'hsl(var(--money-gold))',
				'money-green-light': 'hsl(var(--money-green-light))',
				'money-gold-light': 'hsl(var(--money-gold-light))',
				bullish: 'hsl(var(--bullish))',
				bearish: 'hsl(var(--bearish))',
				'bullish-light': 'hsl(var(--bullish-light))',
				'bearish-light': 'hsl(var(--bearish-light))',
				'chart-bg': 'hsl(var(--chart-bg))',
				'chart-grid': 'hsl(var(--chart-grid))',
				'volume-up': 'hsl(var(--volume-up))',
				'volume-down': 'hsl(var(--volume-down))',
				success: 'hsl(var(--success))',
				warning: 'hsl(var(--warning))',
				info: 'hsl(var(--info))'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'float-money': {
					'0%': { transform: 'translateY(100vh) rotate(0deg)', opacity: '0' },
					'10%': { opacity: '0.6' },
					'90%': { opacity: '0.3' },
					'100%': { transform: 'translateY(-10vh) rotate(360deg)', opacity: '0' }
				},
				'glow-green': {
					'0%, 100%': { boxShadow: '0 0 10px hsl(142 76% 36% / 0.3)' },
					'50%': { boxShadow: '0 0 25px hsl(142 76% 36% / 0.5), 0 0 50px hsl(142 76% 36% / 0.15)' }
				},
				'shimmer-gold': {
					'0%': { backgroundPosition: '-200% center' },
					'100%': { backgroundPosition: '200% center' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'float-money': 'float-money linear infinite',
				'glow-green': 'glow-green 2s ease-in-out infinite',
				'shimmer-gold': 'shimmer-gold 3s linear infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
