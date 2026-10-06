import { Children, cloneElement, isValidElement, useState, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { Pressable as NativePressable, Text, type StyleProp, type TextStyle } from 'react-native';
import { getActiveScheme } from '@/constants/theme';
import { SelectionBorder } from './SelectionBorder';

// Gold border treatment adapted from Uiverse.io by vinodjangid07.
function selectionContent(children: ReactNode): ReactNode {
  return Children.map(children, child => {
    if (!isValidElement(child)) return child;
    const element = child as ReactElement<{ children?: ReactNode; style?: StyleProp<TextStyle>; color?: string }>;
    return cloneElement(element, {
      ...(element.type === Text ? { style: [element.props.style, { color: '#FFD277' }] } : {}),
      ...(typeof element.props.color === 'string' ? { color: '#FFD277' } : {}),
    }, selectionContent(element.props.children));
  });
}

export function AppPressable({ children, style, onHoverIn, onHoverOut, appearance, ...props }: ComponentProps<typeof NativePressable> & { appearance?: 'action' | 'selection' | 'plain' }) {
  "use no memo"; // The resolved theme is supplied by the root theme boundary.
  const [hovered, setHovered] = useState(false);
  const decorative = getActiveScheme() === 'dark' && appearance !== 'plain' && props.accessible !== false && props.accessibilityRole !== 'image';
  const selected = props.accessibilityState?.selected === true || props.accessibilityState?.checked === true;
  return <NativePressable {...props}
    onHoverIn={event => { setHovered(true); onHoverIn?.(event); }}
    onHoverOut={event => { setHovered(false); onHoverOut?.(event); }}
    style={state => [typeof style === 'function' ? style(state) : style,
      decorative && { borderRadius: 10, backgroundColor: selected ? '#30220B' : '#101010', borderWidth: 0 },
      decorative && state.pressed && { transform: [{ scale: 0.95 }] }]}>
    {state => <>
      {decorative ? <SelectionBorder active={!props.disabled && (state.pressed || hovered)} selected={selected} /> : null}
      {decorative ? selectionContent(typeof children === 'function' ? children(state) : children) : typeof children === 'function' ? children(state) : children}
    </>}
  </NativePressable>;
}
