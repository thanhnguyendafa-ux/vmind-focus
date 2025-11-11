import { RelationDesign, TypographyDesign } from '../../types';

// This file centralizes constants related to flashcard design.

export const DEFAULT_TYPOGRAPHY: TypographyDesign = {
  color: '#111827',
  fontSize: '1.125rem', // Changed from 1.5rem to 18px for better mobile readability.
  fontFamily: 'Inter, sans-serif',
  textAlign: 'center',
  fontWeight: 'bold',
};

export const DARK_MODE_DEFAULT_TYPOGRAPHY: TypographyDesign = { ...DEFAULT_TYPOGRAPHY, color: '#f1f5f9' };

export const DEFAULT_RELATION_DESIGN: RelationDesign = {
  front: { backgroundType: 'solid', backgroundValue: '#FFFFFF', gradientAngle: 135, typography: {}, layout: 'vertical' },
  back: { backgroundType: 'solid', backgroundValue: '#F9FAFB', gradientAngle: 135, typography: {}, layout: 'vertical' },
  designLinked: true,
};

export const DESIGN_TEMPLATES: {name: string, design: RelationDesign, frontTypography: TypographyDesign, backTypography: TypographyDesign}[] = [
    {
        name: 'Graphite & Gold',
        frontTypography: { color: '#cda434', fontSize: '1.625rem', fontFamily: 'Poppins, sans-serif', textAlign: 'center', fontWeight: 'bold' },
        backTypography: { color: '#e0c585', fontSize: '1.25rem', fontFamily: 'Poppins, sans-serif', textAlign: 'center', fontWeight: 'normal' },
        design: {
            front: { backgroundType: 'solid', backgroundValue: '#2d3748', gradientAngle: 135, typography: {}, layout: 'vertical' },
            back: { backgroundType: 'solid', backgroundValue: '#1a202c', gradientAngle: 135, typography: {}, layout: 'vertical' }
        }
    },
    {
        name: 'Classic Ivory',
        frontTypography: { color: '#5D4037', fontSize: '1.5rem', fontFamily: 'Lora, serif', textAlign: 'center', fontWeight: 'normal' },
        backTypography: { color: '#5D4037', fontSize: '1.25rem', fontFamily: 'Lora, serif', textAlign: 'center', fontWeight: 'normal' },
        design: {
            front: { backgroundType: 'solid', backgroundValue: '#FDFDF0', gradientAngle: 135, typography: {}, layout: 'vertical' },
            back: { backgroundType: 'solid', backgroundValue: '#F8F8F8', gradientAngle: 135, typography: {}, layout: 'vertical' }
        }
    },
    {
        name: 'Neon City',
        frontTypography: { color: '#22d3ee', fontSize: '1.5rem', fontFamily: 'monospace', textAlign: 'center', fontWeight: 'bold' },
        backTypography: { color: '#c026d3', fontSize: '1.25rem', fontFamily: 'monospace', textAlign: 'center', fontWeight: 'normal' },
        design: {
            front: { backgroundType: 'gradient', backgroundValue: '#1e293b,#0f172a', gradientAngle: 120, typography: {}, layout: 'vertical' },
            back: { backgroundType: 'solid', backgroundValue: '#0f172a', gradientAngle: 135, typography: {}, layout: 'vertical' }
        }
    },
    {
        name: 'Ocean Breeze',
        frontTypography: { color: '#00796B', fontSize: '1.5rem', fontFamily: 'Inter, sans-serif', textAlign: 'center', fontWeight: 'bold' },
        backTypography: { color: '#00796B', fontSize: '1.25rem', fontFamily: 'Inter, sans-serif', textAlign: 'center', fontWeight: 'normal' },
        design: {
            front: { backgroundType: 'gradient', backgroundValue: '#E0F7FA,#FFFFFF', gradientAngle: 180, typography: {}, layout: 'vertical' },
            back: { backgroundType: 'solid', backgroundValue: '#B2EBF2', gradientAngle: 135, typography: {}, layout: 'vertical' }
        }
    },
    {
        name: 'Autumn Forest',
        frontTypography: { color: '#FFF8E1', fontSize: '1.5rem', fontFamily: 'Lora, serif', textAlign: 'center', fontWeight: 'bold' },
        backTypography: { color: '#4E342E', fontSize: '1.25rem', fontFamily: 'Lora, serif', textAlign: 'center', fontWeight: 'normal' },
        design: {
            front: { backgroundType: 'solid', backgroundValue: '#D84315', gradientAngle: 45, typography: {}, layout: 'vertical' },
            back: { backgroundType: 'solid', backgroundValue: '#FFF8E1', gradientAngle: 135, typography: {}, layout: 'vertical' }
        }
    },
    {
        name: 'Sakura Dream',
        frontTypography: { color: '#AD1457', fontSize: '1.5rem', fontFamily: 'Poppins, sans-serif', textAlign: 'center', fontWeight: 'bold' },
        backTypography: { color: '#6A1B9A', fontSize: '1.25rem', fontFamily: 'Poppins, sans-serif', textAlign: 'center', fontWeight: 'normal' },
        design: {
            front: { backgroundType: 'solid', backgroundValue: '#FCE4EC', gradientAngle: 165, typography: {}, layout: 'vertical' },
            back: { backgroundType: 'solid', backgroundValue: '#F3E5F5', gradientAngle: 135, typography: {}, layout: 'vertical' }
        }
    },
    {
        name: 'Minimalist',
        frontTypography: { color: '#111827', fontSize: '1.5rem', fontFamily: 'Inter, sans-serif', textAlign: 'center', fontWeight: 'normal' },
        backTypography: { color: '#4b5563', fontSize: '1.25rem', fontFamily: 'Inter, sans-serif', textAlign: 'center', fontWeight: 'normal' },
        design: {
            front: { backgroundType: 'solid', backgroundValue: '#FFFFFF', gradientAngle: 135, typography: {}, layout: 'vertical' },
            back: { backgroundType: 'solid', backgroundValue: '#F9FAFB', gradientAngle: 135, typography: {}, layout: 'vertical' }
        }
    },
    {
        name: 'Earthy Green',
        frontTypography: { color: '#FEFCE8', fontSize: '1.5rem', fontFamily: 'Lora, serif', textAlign: 'center', fontWeight: 'normal' },
        backTypography: { color: '#2F855A', fontSize: '1.25rem', fontFamily: 'Lora, serif', textAlign: 'center', fontWeight: 'normal' },
        design: {
            front: { backgroundType: 'solid', backgroundValue: '#38A169', gradientAngle: 135, typography: {}, layout: 'vertical' },
            back: { backgroundType: 'solid', backgroundValue: '#F0FFF4', gradientAngle: 135, typography: {}, layout: 'vertical' }
        }
    },
    {
        name: 'Pastel Sky',
        frontTypography: { color: '#2D3748', fontSize: '1.5rem', fontFamily: 'Poppins, sans-serif', textAlign: 'center', fontWeight: 'bold' },
        backTypography: { color: '#2D3748', fontSize: '1.25rem', fontFamily: 'Poppins, sans-serif', textAlign: 'center', fontWeight: 'normal' },
        design: {
            front: { backgroundType: 'solid', backgroundValue: '#BEE3F8', gradientAngle: 135, typography: {}, layout: 'vertical' },
            back: { backgroundType: 'solid', backgroundValue: '#E9D8FD', gradientAngle: 135, typography: {}, layout: 'vertical' }
        }
    }
];