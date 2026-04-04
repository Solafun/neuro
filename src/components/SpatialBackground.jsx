import React from 'react';

export default function SpatialBackground({ auraColor }) {
    // Helper to generate complementary or slightly shifted colors for richness
    const getShiftedColor = (hex, amount) => {
        if (!hex) return null;
        // Simple logic to ensure we have a fallback or variety if needed
        return hex;
    };

    return (
        <div className="spatial-bg">
            <div
                className="blob"
                style={{
                    width: '100vmin',
                    height: '100vmin',
                    background: auraColor
                        ? `linear-gradient(135deg, ${auraColor} 0%, #ffffffdd 100%)`
                        : 'linear-gradient(135deg, #007AFF 0%, #AF52DE 100%)',
                    top: '-20vh',
                    right: '-20vw',
                    animationDelay: '0s',
                    opacity: auraColor ? 0.4 : 0.45,
                    transform: 'translate3d(0, 0, 0)'
                }}
            />
            <div
                className="blob"
                style={{
                    width: '90vmin',
                    height: '90vmin',
                    background: auraColor
                        ? `linear-gradient(135deg, ${auraColor} 0%, #22222244 100%)`
                        : 'linear-gradient(135deg, #FF2D55 0%, #FF9500 100%)',
                    top: '55vh',
                    left: '-15vw',
                    animationDelay: '-5s',
                    opacity: auraColor ? 0.3 : 0.3,
                    transform: 'translate3d(0, 0, 0)'
                }}
            />
            <div
                className="blob"
                style={{
                    width: '80vmin',
                    height: '80vmin',
                    background: auraColor
                        ? `linear-gradient(135deg, #ffffffbb 0%, ${auraColor} 100%)`
                        : 'linear-gradient(135deg, #5856D6 0%, #007AFF 100%)',
                    top: '20vh',
                    right: '5vw',
                    animationDelay: '-10s',
                    opacity: auraColor ? 0.25 : 0.25,
                    transform: 'translate3d(0, 0, 0)'
                }}
            />
        </div>
    );
}
