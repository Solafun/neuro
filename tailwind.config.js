/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                display: ['Inter', 'sans-serif'],
                heading: ['Outfit', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                primary: '#007AFF',
                'background-light': '#F2F2F7',
                'card-gray': '#8E8E93',
                success: '#10B981',
                danger: '#FF3B30',
                warning: '#FF9500',
                'accent-purple': '#AF52DE',
                'premium-black': '#121212',
            },
        },
    },
    plugins: [],
}
