#!/usr/bin/env node

import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a 400x400 canvas
const canvas = createCanvas(400, 400);
const ctx = canvas.getContext('2d');

// Colors
const colors = {
    primary: '#4285f4',    // Google Blue
    secondary: '#34a853',  // Google Green
    accent1: '#fbbc05',    // Google Yellow
    accent2: '#ea4335',    // Google Red
    dark: '#202124',       // Dark Gray
    light: '#ffffff'       // White
};

// Clear canvas
ctx.clearRect(0, 0, canvas.width, canvas.height);

// Background
ctx.fillStyle = colors.light;
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Draw circular background
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const radius = 160;

// Main circle
ctx.beginPath();
ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
ctx.fillStyle = colors.primary;
ctx.fill();

// Inner circle (white)
ctx.beginPath();
ctx.arc(centerX, centerY, radius - 20, 0, 2 * Math.PI);
ctx.fillStyle = colors.light;
ctx.fill();

// Draw magnifying glass
const glassRadius = 70;
const glassX = centerX - 20;
const glassY = centerY - 20;
const handleLength = 100;
const handleWidth = 25;
const handleAngle = Math.PI / 4; // 45 degrees

// Glass circle
ctx.beginPath();
ctx.arc(glassX, glassY, glassRadius, 0, 2 * Math.PI);
ctx.strokeStyle = colors.primary;
ctx.lineWidth = 15;
ctx.stroke();

// Glass handle
const handleStartX = glassX + glassRadius * Math.cos(handleAngle);
const handleStartY = glassY + glassRadius * Math.sin(handleAngle);
const handleEndX = handleStartX + handleLength * Math.cos(handleAngle);
const handleEndY = handleStartY + handleLength * Math.sin(handleAngle);

ctx.beginPath();
ctx.moveTo(handleStartX, handleStartY);
ctx.lineTo(handleEndX, handleEndY);
ctx.lineCap = 'round';
ctx.strokeStyle = colors.primary;
ctx.lineWidth = handleWidth;
ctx.stroke();

// Draw MCP connection nodes
const nodeRadius = 12;
const nodeDistance = 110;

// Draw 3 nodes around the magnifying glass
for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI / 3) + Math.PI / 6;
    const nodeX = centerX + nodeDistance * Math.cos(angle);
    const nodeY = centerY + nodeDistance * Math.sin(angle);
    
    // Node circle
    ctx.beginPath();
    ctx.arc(nodeX, nodeY, nodeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = i === 0 ? colors.accent2 : (i === 1 ? colors.accent1 : colors.secondary);
    ctx.fill();
    
    // Connection line to center
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(nodeX, nodeY);
    ctx.strokeStyle = i === 0 ? colors.accent2 : (i === 1 ? colors.accent1 : colors.secondary);
    ctx.lineWidth = 3;
    ctx.stroke();
}

// Save the logo to a file
const outputPath = path.join(__dirname, 'logo.png');
const out = fs.createWriteStream(outputPath);
const stream = canvas.createPNGStream();
stream.pipe(out);
out.on('finish', () => {
    console.log(`Logo saved to ${outputPath}`);
    console.log('Logo dimensions: 400x400 pixels');
});
