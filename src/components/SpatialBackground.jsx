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
                    width: '400px',
                    height: '400px',
                    background: auraColor
                        ? `linear-gradient(135deg, ${auraColor} 0%, #ffffff88 100%)`
                        : 'linear-gradient(135deg, #007AFF 0%, #AF52DE 100%)',
                    top: '-50px',
                    right: '-50px',
                    animationDelay: '0s',
                    opacity: auraColor ? 0.4 : 0.45
                }}
            />
            <div
                className="blob"
                style={{
                    width: '350px',
                    height: '350px',
                    background: auraColor
                        ? `linear-gradient(135deg, ${auraColor} 0%, #00000044 100%)`
                        : 'linear-gradient(135deg, #FF2D55 0%, #FF9500 100%)',
                    top: '550px',
                    left: '-30px',
                    animationDelay: '-5s',
                    opacity: auraColor ? 0.3 : 0.3
                }}
            />
            <div
                className="blob"
                style={{
                    width: '300px',
                    height: '300px',
                    background: auraColor
                        ? `linear-gradient(135deg, #ffffff 0%, ${auraColor} 100%)`
                        : 'linear-gradient(135deg, #5856D6 0%, #007AFF 100%)',
                    top: '250px',
                    right: '10px',
                    animationDelay: '-10s',
                    opacity: auraColor ? 0.25 : 0.25
                }}
            />
        </div>
    );
}
