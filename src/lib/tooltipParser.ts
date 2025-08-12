import tooltipData from '../data/tooltips.json';

export interface ParsedTextSegment {
  type: 'text' | 'tooltip';
  content: string;
  tooltipId?: string;
  imagePath?: string;
}

/**
 * Parses text with {{text[id:1]}} syntax into segments
 * @param text - The text to parse
 * @returns Array of parsed segments
 */
export const parseTooltipText = (text: string): ParsedTextSegment[] => {
  const segments: ParsedTextSegment[] = [];
  const regex = /\{\{([^}]+)\[id:(\d+)\]\}\}/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const [, tooltipText, tooltipId] = match;
    const matchStart = match.index;
    
    // Add text before the tooltip
    if (matchStart > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, matchStart)
      });
    }
    
    // Look up the image path from the tooltip data
    const imagePath = tooltipData[tooltipId as keyof typeof tooltipData];
    
    if (imagePath) {
      // Add the tooltip segment
      segments.push({
        type: 'tooltip',
        content: tooltipText,
        tooltipId,
        imagePath
      });
    } else {
      // If no image path found, treat as regular text
      console.warn(`Tooltip ID ${tooltipId} not found in tooltips.json`);
      segments.push({
        type: 'text',
        content: tooltipText
      });
    }
    
    lastIndex = regex.lastIndex;
  }
  
  // Add any remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }
  
  return segments;
};

/**
 * Simple utility to check if text contains tooltip syntax
 * @param text - The text to check
 * @returns Boolean indicating if text contains tooltips
 */
export const hasTooltips = (text: string): boolean => {
  return /\{\{[^}]+\[id:\d+\]\}\}/.test(text);
};