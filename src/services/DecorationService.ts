import type { DecorationItem, DecorationType } from '@/types'

export interface DecorationPreset {
  id: string
  type: DecorationType
  name: string
  src: string
  defaultWidth: number
  defaultHeight: number
}

export interface DecorationServiceOptions {
  generateId?: () => string
}

const svgToDataUri = (svg: string): string => {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const LEAF_SVGS = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" width="100" height="60">
    <defs>
      <linearGradient id="leaf1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#8B7355;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#6B5344;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#4A3728;stop-opacity:1" />
      </linearGradient>
    </defs>
    <path d="M10,30 Q25,10 50,15 Q75,20 90,30 Q75,40 50,45 Q25,50 10,30" fill="url(#leaf1)" opacity="0.9"/>
    <path d="M15,30 Q30,25 50,28 Q70,31 85,30" stroke="#3D2C1E" stroke-width="1.5" fill="none" opacity="0.6"/>
    <path d="M30,22 L35,27 M40,20 L45,26 M50,19 L53,25 M60,21 L64,27 M70,24 L73,29" stroke="#3D2C1E" stroke-width="0.8" fill="none" opacity="0.4"/>
    <path d="M30,38 L35,33 M40,40 L45,34 M50,41 L53,35 M60,39 L64,33 M70,36 L73,31" stroke="#3D2C1E" stroke-width="0.8" fill="none" opacity="0.4"/>
  </svg>`,

  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
    <defs>
      <linearGradient id="leaf2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#A0826D;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#5C4033;stop-opacity:1" />
      </linearGradient>
    </defs>
    <path d="M40,5 L55,25 L75,35 L55,45 L40,75 L25,45 L5,35 L25,25 Z" fill="url(#leaf2)" opacity="0.85"/>
    <path d="M40,5 L40,75 M25,25 L40,40 L55,25 M15,30 L40,50 L65,30 M25,45 L40,55 L55,45" stroke="#3D2C1E" stroke-width="1" fill="none" opacity="0.5"/>
  </svg>`,

  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 50" width="120" height="50">
    <defs>
      <linearGradient id="leaf3" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#9B8B7A;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#6B5D4D;stop-opacity:1" />
      </linearGradient>
    </defs>
    <path d="M5,25 Q20,5 40,10 Q60,15 80,12 Q100,9 115,25 Q100,41 80,38 Q60,35 40,40 Q20,45 5,25" fill="url(#leaf3)" opacity="0.9"/>
    <path d="M10,25 Q30,22 60,24 Q90,26 110,25" stroke="#3D2C1E" stroke-width="1" fill="none" opacity="0.5"/>
    <g opacity="0.3" stroke="#3D2C1E" stroke-width="0.7" fill="none">
      <path d="M25,18 L30,22 M35,15 L40,21 M45,13 L50,20 M55,12 L60,20 M65,13 L70,21 M75,15 L80,22 M85,18 L90,23"/>
      <path d="M25,32 L30,28 M35,35 L40,29 M45,37 L50,30 M55,38 L60,30 M65,37 L70,29 M75,35 L80,28 M85,32 L90,27"/>
    </g>
  </svg>`,

  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 90" width="70" height="90">
    <defs>
      <linearGradient id="leaf4" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#C4A484;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#8B7355;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#5C4033;stop-opacity:1" />
      </linearGradient>
    </defs>
    <path d="M35,5 L50,20 L55,40 L45,60 L35,85 L25,60 L15,40 L20,20 Z" fill="url(#leaf4)" opacity="0.88"/>
    <ellipse cx="35" cy="45" rx="8" ry="12" fill="#3D2C1E" opacity="0.15"/>
    <path d="M35,5 L35,85 M20,20 L35,40 L50,20 M25,35 L35,50 L45,35 M25,55 L35,65 L45,55" stroke="#3D2C1E" stroke-width="1" fill="none" opacity="0.5"/>
  </svg>`,

  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 70" width="90" height="70">
    <defs>
      <linearGradient id="leaf5" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#8B6914;stop-opacity:0.9" />
        <stop offset="50%" style="stop-color:#A67C52;stop-opacity:0.9" />
        <stop offset="100%" style="stop-color:#6B4423;stop-opacity:0.9" />
      </linearGradient>
    </defs>
    <path d="M10,35 Q25,10 45,15 Q55,5 65,15 Q85,20 80,35 Q85,50 65,55 Q55,65 45,55 Q25,60 10,35" fill="url(#leaf5)" opacity="0.85"/>
    <path d="M15,35 Q35,32 45,34 Q55,36 75,35" stroke="#3D2C1E" stroke-width="1.2" fill="none" opacity="0.6"/>
    <g transform="rotate(-15 45 35)" opacity="0.4">
      <circle cx="30" cy="25" r="3" fill="#3D2C1E"/>
      <circle cx="55" cy="28" r="2" fill="#3D2C1E"/>
      <circle cx="40" cy="42" r="2.5" fill="#3D2C1E"/>
    </g>
    <path d="M25,22 L30,28 M35,18 L40,26 M45,16 L48,25 M55,18 L58,27 M65,22 L68,28" stroke="#3D2C1E" stroke-width="0.6" fill="none" opacity="0.3"/>
  </svg>`
]

const ROPE_SVGS = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" width="200" height="40">
    <defs>
      <linearGradient id="rope1" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#C4A484;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#A67C52;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#8B6914;stop-opacity:1" />
      </linearGradient>
    </defs>
    <g fill="url(#rope1)">
      ${Array.from({ length: 20 }, (_, i) => `
        <ellipse cx="${10 + i * 9.5}" cy="20" rx="6" ry="8" transform="rotate(${(i % 2 === 0 ? -20 : 20)} ${10 + i * 9.5} 20)"/>
      `).join('')}
    </g>
    <path d="M5,20 Q10,15 15,20 Q20,25 25,20 Q30,15 35,20 Q40,25 45,20 Q50,15 55,20 Q60,25 65,20 Q70,15 75,20 Q80,25 85,20 Q90,15 95,20 Q100,25 105,20 Q110,15 115,20 Q120,25 125,20 Q130,15 135,20 Q140,25 145,20 Q150,15 155,20 Q160,25 165,20 Q170,15 175,20 Q180,25 185,20 Q190,15 195,20" stroke="#5C4033" stroke-width="1" fill="none" opacity="0.4"/>
  </svg>`,

  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" width="150" height="150">
    <defs>
      <linearGradient id="rope2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#D4A853;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#8B6914;stop-opacity:1" />
      </linearGradient>
    </defs>
    <path d="M10,10 Q75,5 75,75 Q75,145 140,140" stroke="url(#rope2)" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M10,10 Q75,5 75,75 Q75,145 140,140" stroke="#5C4033" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.2" stroke-dasharray="2,4"/>
    <circle cx="10" cy="10" r="8" fill="url(#rope2)"/>
    <circle cx="140" cy="140" r="8" fill="url(#rope2)"/>
  </svg>`,

  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="rope3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#B8956E;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#7A5C3E;stop-opacity:1" />
      </linearGradient>
    </defs>
    <g fill="url(#rope3)">
      ${Array.from({ length: 15 }, (_, i) => `
        <ellipse cx="${15 + i * 5}" cy="${15 + i * 5}" rx="4" ry="6" transform="rotate(45 ${15 + i * 5} ${15 + i * 5})"/>
      `).join('')}
    </g>
    ${Array.from({ length: 8 }, (_, i) => `
      <circle cx="${8 + i * 3}" cy="${8 + i * 3}" r="2" fill="#5C4033" opacity="0.3"/>
    `).join('')}
  </svg>`
]

const FRAME_SVGS = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400">
    <defs>
      <linearGradient id="frame1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#E8DCC8;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#D4C4A8;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#B8A082;stop-opacity:1" />
      </linearGradient>
      <filter id="noise1">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" />
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.1"/>
        </feComponentTransfer>
      </filter>
    </defs>
    <rect x="0" y="0" width="300" height="400" fill="url(#frame1)" opacity="0.95"/>
    <rect x="0" y="0" width="300" height="400" filter="url(#noise1)"/>
    <rect x="15" y="15" width="270" height="370" fill="none" stroke="#8B7355" stroke-width="2" opacity="0.3"/>
    <rect x="20" y="20" width="260" height="360" fill="none" stroke="#8B7355" stroke-width="1" opacity="0.5" stroke-dasharray="4,2"/>
    <g opacity="0.15">
      ${Array.from({ length: 20 }, (_, i) => `
        <line x1="${i * 15}" y1="0" x2="${i * 15 + 5}" y2="400" stroke="#5C4033" stroke-width="0.5"/>
      `).join('')}
    </g>
    <rect x="0" y="0" width="300" height="400" fill="none" stroke="#5C4033" stroke-width="4" opacity="0.2"/>
  </svg>`,

  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 450" width="350" height="450">
    <defs>
      <linearGradient id="frame2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#F0E6D3;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#C9B896;stop-opacity:1" />
      </linearGradient>
      <pattern id="dots" patternUnits="userSpaceOnUse" width="10" height="10">
        <circle cx="5" cy="5" r="0.5" fill="#8B7355" opacity="0.3"/>
      </pattern>
    </defs>
    <rect x="0" y="0" width="350" height="450" fill="url(#frame2)"/>
    <rect x="0" y="0" width="350" height="450" fill="url(#dots)"/>
    <path d="M25,25 L25,425 L325,425 L325,25 Z" fill="none" stroke="#A67C52" stroke-width="3" opacity="0.4"/>
    <path d="M30,30 L30,420 L320,420 L320,30 Z" fill="none" stroke="#A67C52" stroke-width="1" opacity="0.6"/>
    <path d="M35,35 L35,415 L315,415 L315,35 Z" fill="none" stroke="#8B6914" stroke-width="0.5" opacity="0.4" stroke-dasharray="2,3"/>
    <g fill="#8B6914" opacity="0.2">
      <circle cx="40" cy="40" r="3"/>
      <circle cx="310" cy="40" r="3"/>
      <circle cx="40" cy="410" r="3"/>
      <circle cx="310" cy="410" r="3"/>
    </g>
    <rect x="0" y="0" width="350" height="450" fill="none" stroke="#6B5344" stroke-width="5" opacity="0.15"/>
  </svg>`
]

const STICKER_SVGS = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" width="120" height="80">
    <defs>
      <linearGradient id="sticker1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FFF5E6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#FFE4C4;stop-opacity:1" />
      </linearGradient>
      <filter id="rough1">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5"/>
        <feDisplacementMap in="SourceGraphic" scale="1.5"/>
      </filter>
    </defs>
    <path d="M10,15 L110,10 L115,65 L15,70 Z" fill="url(#sticker1)" filter="url(#rough1)" opacity="0.95"/>
    <path d="M10,15 L110,10 L115,65 L15,70 Z" fill="none" stroke="#B8860B" stroke-width="1.5" opacity="0.5" filter="url(#rough1)"/>
    <text x="60" y="48" text-anchor="middle" font-family="Ma Shan Zheng, cursive" font-size="32" fill="#8B4513" opacity="0.85" filter="url(#rough1)">标本</text>
    <text x="60" y="62" text-anchor="middle" font-family="Courier New, monospace" font-size="10" fill="#A0522D" opacity="0.6">SPECIMEN</text>
  </svg>`,

  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <radialGradient id="sticker2" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#FFFAF0;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#F5DEB3;stop-opacity:1" />
      </radialGradient>
      <filter id="rough2">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4"/>
        <feDisplacementMap in="SourceGraphic" scale="2"/>
      </filter>
    </defs>
    <circle cx="50" cy="50" r="42" fill="url(#sticker2)" filter="url(#rough2)" opacity="0.9"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke="#CD853F" stroke-width="2" opacity="0.6" filter="url(#rough2)"/>
    <circle cx="50" cy="50" r="35" fill="none" stroke="#DEB887" stroke-width="1" opacity="0.4" stroke-dasharray="3,2" filter="url(#rough2)"/>
    <text x="50" y="48" text-anchor="middle" font-family="Ma Shan Zheng, cursive" font-size="28" fill="#8B0000" opacity="0.8" filter="url(#rough2)">珍藏</text>
    <text x="50" y="65" text-anchor="middle" font-family="Courier New, monospace" font-size="8" fill="#A0522D" opacity="0.6" filter="url(#rough2)">TREASURE</text>
    <g fill="#8B0000" opacity="0.3" filter="url(#rough2)">
      <path d="M25,30 L27,25 L29,30 Z"/>
      <path d="M75,30 L77,25 L79,30 Z"/>
      <path d="M25,75 L27,70 L29,75 Z"/>
      <path d="M75,75 L77,70 L79,75 Z"/>
    </g>
  </svg>`,

  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 60" width="140" height="60">
    <defs>
      <linearGradient id="sticker3" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#F5FFFA;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#E0EEE0;stop-opacity:1" />
      </linearGradient>
      <filter id="rough3">
        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="5"/>
        <feDisplacementMap in="SourceGraphic" scale="1"/>
      </filter>
    </defs>
    <path d="M5,10 Q10,5 20,8 L120,5 Q130,8 135,15 Q138,30 135,45 Q130,52 120,55 L20,52 Q10,55 5,50 Q2,30 5,10" fill="url(#sticker3)" filter="url(#rough3)" opacity="0.95"/>
    <path d="M5,10 Q10,5 20,8 L120,5 Q130,8 135,15 Q138,30 135,45 Q130,52 120,55 L20,52 Q10,55 5,50 Q2,30 5,10" fill="none" stroke="#556B2F" stroke-width="1.5" opacity="0.5" filter="url(#rough3)"/>
    <text x="70" y="40" text-anchor="middle" font-family="Ma Shan Zheng, cursive" font-size="26" fill="#2F4F4F" opacity="0.85" filter="url(#rough3)">自然</text>
    <text x="70" y="52" text-anchor="middle" font-family="Courier New, monospace" font-size="9" fill="#556B2F" opacity="0.6" filter="url(#rough3)">NATURE</text>
    <g fill="#228B22" opacity="0.25">
      <circle cx="20" cy="15" r="2"/>
      <circle cx="120" cy="18" r="1.5"/>
      <circle cx="25" cy="48" r="1.5"/>
      <circle cx="115" cy="45" r="2"/>
    </g>
  </svg>`,

  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 110" width="110" height="110">
    <defs>
      <linearGradient id="sticker4" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FFFAF0;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#FAEBD7;stop-opacity:1" />
      </linearGradient>
      <filter id="rough4">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5"/>
        <feDisplacementMap in="SourceGraphic" scale="1.5"/>
      </filter>
    </defs>
    <polygon points="55,5 100,30 100,80 55,105 10,80 10,30" fill="url(#sticker4)" filter="url(#rough4)" opacity="0.92"/>
    <polygon points="55,5 100,30 100,80 55,105 10,80 10,30" fill="none" stroke="#8B4513" stroke-width="2" opacity="0.5" filter="url(#rough4)"/>
    <polygon points="55,15 90,35 90,75 55,95 20,75 20,35" fill="none" stroke="#CD853F" stroke-width="1" opacity="0.4" stroke-dasharray="2,3" filter="url(#rough4)"/>
    <text x="55" y="50" text-anchor="middle" font-family="Ma Shan Zheng, cursive" font-size="24" fill="#8B4513" opacity="0.85" filter="url(#rough4)">记忆</text>
    <text x="55" y="70" text-anchor="middle" font-family="Courier New, monospace" font-size="10" fill="#A0522D" opacity="0.6" filter="url(#rough4)">MEMORY</text>
    <text x="55" y="85" text-anchor="middle" font-family="Courier New, monospace" font-size="8" fill="#8B4513" opacity="0.4" filter="url(#rough4)">♦ HERBARIUM ♦</text>
  </svg>`
]

const TAPE_SVGS = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 40" width="150" height="40">
    <defs>
      <linearGradient id="tape1" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#FFE4B5;stop-opacity:0.85" />
        <stop offset="100%" style="stop-color:#DEB887;stop-opacity:0.75" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="150" height="40" fill="url(#tape1)"/>
    <g opacity="0.3">
      ${Array.from({ length: 15 }, (_, i) => `
        <line x1="${i * 10}" y1="0" x2="${i * 10 + 6}" y2="40" stroke="#D2691E" stroke-width="0.5"/>
      `).join('')}
    </g>
    <rect x="0" y="0" width="150" height="40" fill="none" stroke="#CD853F" stroke-width="0.5" opacity="0.4"/>
    <path d="M0,2 L5,0 L10,3 L15,1 L20,2 L25,0 L30,3 L35,1 L40,2 L45,0 L50,3 L55,1 L60,2 L65,0 L70,3 L75,1 L80,2 L85,0 L90,3 L95,1 L100,2 L105,0 L110,3 L115,1 L120,2 L125,0 L130,3 L135,1 L140,2 L145,0 L150,2" stroke="#CD853F" stroke-width="0.5" fill="none" opacity="0.3"/>
    <path d="M0,38 L5,40 L10,37 L15,39 L20,38 L25,40 L30,37 L35,39 L40,38 L45,40 L50,37 L55,39 L60,38 L65,40 L70,37 L75,39 L80,38 L85,40 L90,37 L95,39 L100,38 L105,40 L110,37 L115,39 L120,38 L125,40 L130,37 L135,39 L140,38 L145,40 L150,38" stroke="#CD853F" stroke-width="0.5" fill="none" opacity="0.3"/>
  </svg>`,

  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 50" width="180" height="50">
    <defs>
      <linearGradient id="tape2" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#90EE90;stop-opacity:0.7" />
        <stop offset="100%" style="stop-color:#3CB371;stop-opacity:0.6" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="180" height="50" fill="url(#tape2)"/>
    <g opacity="0.25">
      ${Array.from({ length: 30 }, (_, i) => `
        <circle cx="${5 + i * 6}" cy="${10 + (i % 3) * 15}" r="${1 + (i % 2)}" fill="#228B22"/>
      `).join('')}
    </g>
    <g opacity="0.2">
      ${Array.from({ length: 12 }, (_, i) => `
        <path d="M${10 + i * 15},5 L${12 + i * 15},${25 + (i % 2) * 10} L${8 + i * 15},${25 + (i % 2) * 10} Z" fill="#006400"/>
      `).join('')}
    </g>
    <rect x="0" y="0" width="180" height="50" fill="none" stroke="#228B22" stroke-width="0.5" opacity="0.3"/>
  </svg>`,

  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 45" width="160" height="45">
    <defs>
      <linearGradient id="tape3" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#FFB6C1;stop-opacity:0.75" />
        <stop offset="100%" style="stop-color:#DB7093;stop-opacity:0.65" />
      </linearGradient>
      <pattern id="flowers" patternUnits="userSpaceOnUse" width="20" height="20">
        <g fill="#C71585" opacity="0.3">
          <circle cx="10" cy="10" r="3"/>
          <circle cx="6" cy="7" r="1.5"/>
          <circle cx="14" cy="7" r="1.5"/>
          <circle cx="6" cy="13" r="1.5"/>
          <circle cx="14" cy="13" r="1.5"/>
          <circle cx="10" cy="10" r="1" fill="#FFD700" opacity="0.5"/>
        </g>
      </pattern>
    </defs>
    <rect x="0" y="0" width="160" height="45" fill="url(#tape3)"/>
    <rect x="0" y="0" width="160" height="45" fill="url(#flowers)"/>
    <g opacity="0.2" stroke="#C71585" stroke-width="0.5" fill="none">
      ${Array.from({ length: 8 }, (_, i) => `
        <path d="M${i * 22},2 Q${5 + i * 22},${8 + (i % 2) * 5} ${10 + i * 22},2"/>
      `).join('')}
    </g>
    <rect x="0" y="0" width="160" height="45" fill="none" stroke="#C71585" stroke-width="0.5" opacity="0.3"/>
  </svg>`
]

const createPreset = (
  id: string,
  type: DecorationType,
  name: string,
  svg: string,
  defaultWidth: number,
  defaultHeight: number
): DecorationPreset => ({
  id,
  type,
  name,
  src: svgToDataUri(svg),
  defaultWidth,
  defaultHeight
})

export class DecorationService {
  private presets: DecorationPreset[] = []
  private idCounter = 0

  constructor(options: DecorationServiceOptions = {}) {
    this.initPresets()
  }

  private initPresets(): void {
    const leafNames = ['橡树叶', '枫叶', '柳叶', '梧桐叶', '银杏叶']
    LEAF_SVGS.forEach((svg, i) => {
      this.presets.push(createPreset(`leaf-${i + 1}`, 'leaf', leafNames[i], svg, 100, 60))
    })

    const ropeNames = ['麻绳边', '麻绳角', '细麻绳']
    ROPE_SVGS.forEach((svg, i) => {
      this.presets.push(createPreset(`rope-${i + 1}`, 'rope', ropeNames[i], svg, 200, 40))
    })

    const frameNames = ['牛皮纸框', '复古纸框']
    FRAME_SVGS.forEach((svg, i) => {
      this.presets.push(createPreset(`frame-${i + 1}`, 'frame', frameNames[i], svg, 300, 400))
    })

    const stickerNames = ['标本贴纸', '珍藏印章', '自然标签', '记忆贴纸']
    STICKER_SVGS.forEach((svg, i) => {
      this.presets.push(createPreset(`sticker-${i + 1}`, 'sticker', stickerNames[i], svg, 120, 80))
    })

    const tapeNames = ['牛皮胶带', '绿叶胶带', '樱花胶带']
    TAPE_SVGS.forEach((svg, i) => {
      this.presets.push(createPreset(`tape-${i + 1}`, 'tape', tapeNames[i], svg, 150, 40))
    })
  }

  generateId(): string {
    this.idCounter++
    return `decoration-${Date.now()}-${this.idCounter}`
  }

  getAllPresets(): DecorationPreset[] {
    return [...this.presets]
  }

  getPresetsByType(type: DecorationType): DecorationPreset[] {
    return this.presets.filter(p => p.type === type)
  }

  getPresetById(id: string): DecorationPreset | undefined {
    return this.presets.find(p => p.id === id)
  }

  createDecoration(presetId: string, x: number = 0, y: number = 0): DecorationItem | null {
    const preset = this.getPresetById(presetId)
    if (!preset) return null

    return {
      id: this.generateId(),
      type: preset.type,
      src: preset.src,
      x,
      y,
      width: preset.defaultWidth,
      height: preset.defaultHeight,
      rotation: 0,
      zIndex: 1,
      opacity: 1
    }
  }

  createDecorationFromPreset(preset: DecorationPreset, x: number = 0, y: number = 0): DecorationItem {
    return {
      id: this.generateId(),
      type: preset.type,
      src: preset.src,
      x,
      y,
      width: preset.defaultWidth,
      height: preset.defaultHeight,
      rotation: 0,
      zIndex: 1,
      opacity: 1
    }
  }

  updateDecoration(
    decorations: DecorationItem[],
    id: string,
    updates: Partial<Omit<DecorationItem, 'id' | 'type' | 'src'>>
  ): DecorationItem[] {
    return decorations.map(d =>
      d.id === id ? { ...d, ...updates } : d
    )
  }

  deleteDecoration(decorations: DecorationItem[], id: string): DecorationItem[] {
    return decorations.filter(d => d.id !== id)
  }

  bringForward(decorations: DecorationItem[], id: string): DecorationItem[] {
    const maxZ = Math.max(...decorations.map(d => d.zIndex), 0)
    return this.updateDecoration(decorations, id, { zIndex: maxZ + 1 })
  }

  sendBackward(decorations: DecorationItem[], id: string): DecorationItem[] {
    const minZ = Math.min(...decorations.map(d => d.zIndex), 0)
    return this.updateDecoration(decorations, id, { zIndex: minZ - 1 })
  }

  bringToFront(decorations: DecorationItem[], id: string): DecorationItem[] {
    const sorted = [...decorations].sort((a, b) => a.zIndex - b.zIndex)
    return sorted.map(d => {
      if (d.id === id) {
        return { ...d, zIndex: sorted.length }
      }
      const idx = sorted.findIndex(s => s.id === d.id)
      return { ...d, zIndex: idx < sorted.findIndex(s => s.id === id) ? d.zIndex : d.zIndex }
    })
  }

  sendToBack(decorations: DecorationItem[], id: string): DecorationItem[] {
    const sorted = [...decorations].sort((a, b) => a.zIndex - b.zIndex)
    return sorted.map((d, idx) => {
      if (d.id === id) {
        return { ...d, zIndex: 0 }
      }
      return { ...d, zIndex: idx + 1 }
    })
  }

  duplicateDecoration(decorations: DecorationItem[], id: string): DecorationItem[] {
    const original = decorations.find(d => d.id === id)
    if (!original) return decorations

    const newDecoration: DecorationItem = {
      ...original,
      id: this.generateId(),
      x: original.x + 20,
      y: original.y + 20,
      zIndex: Math.max(...decorations.map(d => d.zIndex), 0) + 1
    }

    return [...decorations, newDecoration]
  }

  getDefaultDimensions(type: DecorationType): { width: number; height: number } {
    const defaults: Record<DecorationType, { width: number; height: number }> = {
      leaf: { width: 100, height: 60 },
      rope: { width: 200, height: 40 },
      frame: { width: 300, height: 400 },
      sticker: { width: 120, height: 80 },
      tape: { width: 150, height: 40 }
    }
    return defaults[type]
  }

  searchPresets(query: string): DecorationPreset[] {
    const lowerQuery = query.toLowerCase()
    return this.presets.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.type.toLowerCase().includes(lowerQuery)
    )
  }
}

export const decorationService = new DecorationService()

export const createDecoration = decorationService.createDecoration.bind(decorationService)
export const createDecorationFromPreset = decorationService.createDecorationFromPreset.bind(decorationService)
export const updateDecoration = decorationService.updateDecoration.bind(decorationService)
export const deleteDecoration = decorationService.deleteDecoration.bind(decorationService)
export const getAllPresets = decorationService.getAllPresets.bind(decorationService)
export const getPresetsByType = decorationService.getPresetsByType.bind(decorationService)
export const getPresetById = decorationService.getPresetById.bind(decorationService)
export const bringForward = decorationService.bringForward.bind(decorationService)
export const sendBackward = decorationService.sendBackward.bind(decorationService)
export const bringToFront = decorationService.bringToFront.bind(decorationService)
export const sendToBack = decorationService.sendToBack.bind(decorationService)
export const duplicateDecoration = decorationService.duplicateDecoration.bind(decorationService)
export const searchPresets = decorationService.searchPresets.bind(decorationService)
