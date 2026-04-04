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
                    width: '90vmin',
                    height: '90vmin',
                    background: auraColor
                        ? `linear-gradient(135deg, ${auraColor} 0%, #ffffff88 100%)`
                        : 'linear-gradient(135deg, #007AFF 0%, #AF52DE 100%)',
                    top: '-15vmin',
                    right: '-15vmin',
                    animationDelay: '0s',
                    opacity: auraColor ? 0.4 : 0.45
                }}
            />
            <div
                className="blob"
                style={{
                    width: '80vmin',
                    height: '80vmin',
                    background: auraColor
                        ? `linear-gradient(135deg, ${auraColor} 0%, #00000044 100%)`
                        : 'linear-gradient(135deg, #FF2D55 0%, #FF9500 100%)',
                    top: '60vh',
                    left: '-10vmin',
                    animationDelay: '-5s',
                    opacity: auraColor ? 0.3 : 0.3
                }}
            />
            <div
                className="blob"
                style={{
                    width: '70vmin',
                    height: '70vmin',
                    background: auraColor
                        ? `linear-gradient(135deg, #ffffff 0%, ${auraColor} 100%)`
                        : 'linear-gradient(135deg, #5856D6 0%, #007AFF 100%)',
                    top: '25vh',
                    right: '2vmin',
                    animationDelay: '-10s',
                    opacity: auraColor ? 0.25 : 0.25
                }}
            />
        </div>
    );
}
