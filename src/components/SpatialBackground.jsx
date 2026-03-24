import React from 'react';

export default function SpatialBackground() {
    return (
        <div className="spatial-bg">
            <div
                className="blob"
                style={{
                    width: '400px',
                    height: '400px',
                    background: 'linear-gradient(135deg, #007AFF 0%, #AF52DE 100%)',
                    top: '-50px',
                    right: '-50px',
                    animationDelay: '0s'
                }}
            />
            <div
                className="blob"
                style={{
                    width: '350px',
                    height: '350px',
                    background: 'linear-gradient(135deg, #FF2D55 0%, #FF9500 100%)',
                    top: '550px',
                    left: '-30px',
                    animationDelay: '-5s',
                    opacity: 0.3
                }}
            />
            <div
                className="blob"
                style={{
                    width: '300px',
                    height: '300px',
                    background: 'linear-gradient(135deg, #5856D6 0%, #007AFF 100%)',
                    top: '250px',
                    right: '10px',
                    animationDelay: '-10s',
                    opacity: 0.25
                }}
            />
        </div>
    );
}
