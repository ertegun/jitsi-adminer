#!/usr/bin/env python3
"""
Apple Liquid Glass Dark tema güncellemeleri için otomatik dönüştürücü
Eski Tailwind class'larını yeni tema değişkenlerine dönüştürür
"""

import re
import sys

# Renk dönüşüm mapping'i
COLOR_MAP = {
    # Background
    r'bg-gray-50\b': 'bg-background',
    r'bg-gray-100\b': 'bg-secondary',
    r'bg-white\b': 'bg-card',
    r'bg-red-50\b': 'bg-destructive/10',
    r'bg-green-50\b': 'bg-chart-1/10',
    r'bg-yellow-50\b': 'bg-chart-2/10',
    r'bg-blue-50\b': 'bg-chart-3/10',
    r'bg-red-600\b': 'bg-destructive',
    r'bg-blue-600\b': 'bg-primary',
    r'bg-green-600\b': 'bg-chart-1',
    
    # Text colors
    r'text-gray-50\b': 'text-background',
    r'text-gray-500\b': 'text-muted-foreground',
    r'text-gray-600\b': 'text-muted-foreground',
    r'text-gray-700\b': 'text-foreground',
    r'text-gray-900\b': 'text-foreground',
    r'text-red-600\b': 'text-destructive',
    r'text-red-700\b': 'text-destructive',
    r'text-blue-600\b': 'text-primary',
    r'text-green-600\b': 'text-chart-1',
    r'text-yellow-800\b': 'text-chart-2',
    r'text-white\b': 'text-primary-foreground',
    
    # Border
    r'border-gray-200\b': 'border-border',
    r'border-gray-300\b': 'border-border',
    r'border-red-200\b': 'border-destructive/30',
    r'border-green-200\b': 'border-chart-1/30',
    r'border-yellow-200\b': 'border-chart-2/30',
    
    # Hover states
    r'hover:bg-gray-50\b': 'hover:bg-accent',
    r'hover:bg-blue-700\b': 'hover:bg-primary/80',
    r'hover:text-gray-900\b': 'hover:text-foreground',
    r'hover:text-blue-800\b': 'hover:text-primary',
}

def convert_colors(content):
    """Eski renkleri yeni tema renklerine dönüştür"""
    for old, new in COLOR_MAP.items():
        content = re.sub(old, new, content)
    return content

def main():
    if len(sys.argv) < 2:
        print("Kullanım: python convert_theme.py <dosya>")
        sys.exit(1)
    
    filename = sys.argv[1]
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        content = convert_colors(content)
        
        if content != original_content:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ {filename} güncellendi")
        else:
            print(f"ℹ️  {filename} zaten güncel")
            
    except Exception as e:
        print(f"❌ Hata: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
