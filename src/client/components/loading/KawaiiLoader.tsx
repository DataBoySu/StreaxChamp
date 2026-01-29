import React from 'react';
import './KawaiiLoader.css';

export const KawaiiLoader: React.FC = () => {
    return (
        <div className="kawaii-loader-container">
            {/* Animated Floating Heart */}
            <div className="kawaii-loader">
                <div className="pixel-heart">
                    {/* Top Row Split for Heart Shape */}
                    <div className="heart-row row-top-left"></div>
                    <div className="heart-row row-top-right"></div>

                    {/* Body Rows */}
                    <div className="heart-row row-2"></div>
                    <div className="heart-row row-3"></div>
                    <div className="heart-row row-4"></div>
                    <div className="heart-row row-5"></div>
                    <div className="heart-row row-6"></div>
                </div>
            </div>

            {/* Stylish Loading Text */}
            <p className="kawaii-loader-text">Loading...</p>

            {/* Custom Pixel Progress Bar */}
            <div className="kawaii-progress-track">
                <div className="kawaii-progress-fill"></div>
            </div>
        </div>
    );
};
