import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, PanResponder } from 'react-native';
import Svg, { Path, G, Circle, Text as SvgText, Rect, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { VIETNAM_SVG_PATHS } from '../../constants/vietnamSvgPaths';
import type { Branch } from '../../types';

interface VietnamMapProps {
  branches: Branch[];
  selectedBranchId: string | null;
  onSelectBranch: (branch: Branch) => void;
  activeCity?: string;
}

// Map city/name keywords to widely spread-out SVG coordinates on the 812x872 Vietnam SVG canvas
function getBranchSvgCoordinates(b: Branch): { cx: number; cy: number } {
  if (b.mapCoordinates?.svgCx && b.mapCoordinates?.svgCy) {
    return { cx: b.mapCoordinates.svgCx, cy: b.mapCoordinates.svgCy };
  }

  const name = (b.name || '').toLowerCase();
  const address = (b.address || '').toLowerCase();
  const city = (b.city || '').toLowerCase();

  // Miền Bắc (Hà Nội & lân cận)
  if (city.includes('hà nội') || address.includes('hà nội') || name.includes('cầu giấy')) {
    if (name.includes('cầu giấy')) return { cx: 390, cy: 190 };
    return { cx: 395, cy: 195 };
  }

  // Miền Trung (Đà Nẵng & lân cận)
  if (city.includes('đà nẵng') || address.includes('đà nẵng') || name.includes('hải châu')) {
    return { cx: 470, cy: 400 };
  }

  // Miền Nam (TP.HCM & các quận/huyện - phân bổ rộng hơn để khi zoom không bị đè chữ)
  if (city.includes('tp.hcm') || address.includes('tp.hcm') || address.includes('hồ chí minh')) {
    if (name.includes('gò vấp')) return { cx: 350, cy: 620 };
    if (name.includes('thủ đức')) return { cx: 460, cy: 640 };
    if (name.includes('bình thạnh')) return { cx: 430, cy: 660 };
    if (name.includes('tân bình')) return { cx: 360, cy: 670 };
    if (name.includes('tân phú')) return { cx: 310, cy: 700 };
    if (name.includes('quận 1') || name.includes('q.1')) return { cx: 400, cy: 720 };
    return { cx: 380, cy: 670 };
  }

  return { cx: 410, cy: 500 };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH - 48; // padding screen
const MAP_HEIGHT = (MAP_WIDTH * 872) / 812; // preserve 812:872 aspect ratio

const SVG_ORIGINAL_W = 812;
const SVG_ORIGINAL_H = 872;

export const VietnamMapComponent: React.FC<VietnamMapProps> = ({
  branches,
  selectedBranchId,
  onSelectBranch,
  activeCity = 'Tất cả',
}) => {
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [centerCoord, setCenterCoord] = useState<{ cx: number; cy: number }>({
    cx: SVG_ORIGINAL_W / 2,
    cy: SVG_ORIGINAL_H / 2,
  });

  const zoomScaleRef = useRef(zoomScale);
  const centerCoordRef = useRef(centerCoord);
  const startCenterRef = useRef(centerCoord);

  useEffect(() => {
    zoomScaleRef.current = zoomScale;
  }, [zoomScale]);

  useEffect(() => {
    centerCoordRef.current = centerCoord;
  }, [centerCoord]);

  // Pan gesture responder to allow 2D dragging (left, right, up, down)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
      },
      onPanResponderGrant: () => {
        startCenterRef.current = { ...centerCoordRef.current };
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const factorX = (SVG_ORIGINAL_W / MAP_WIDTH) / zoomScaleRef.current;
        const factorY = (SVG_ORIGINAL_H / MAP_HEIGHT) / zoomScaleRef.current;

        const newCx = Math.max(50, Math.min(762, startCenterRef.current.cx - dx * factorX));
        const newCy = Math.max(50, Math.min(822, startCenterRef.current.cy - dy * factorY));

        setCenterCoord({ cx: newCx, cy: newCy });
      },
    })
  ).current;

  // Auto-focus zoom based on city filter
  useEffect(() => {
    if (activeCity === 'TP.HCM') {
      setZoomScale(3.5);
      setCenterCoord({ cx: 385, cy: 665 });
    } else if (activeCity === 'Hà Nội') {
      setZoomScale(3.5);
      setCenterCoord({ cx: 390, cy: 190 });
    } else if (activeCity === 'Đà Nẵng') {
      setZoomScale(3.5);
      setCenterCoord({ cx: 470, cy: 400 });
    } else {
      setZoomScale(1.0);
      setCenterCoord({ cx: SVG_ORIGINAL_W / 2, cy: SVG_ORIGINAL_H / 2 });
    }
  }, [activeCity]);

  // When a branch is selected, focus on it
  const handleBranchSelect = (b: Branch) => {
    const coords = getBranchSvgCoordinates(b);
    setZoomScale(4.5);
    setCenterCoord(coords);
    onSelectBranch(b);
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 1.5, 10.0));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(prev - 1.5, 1.0);
      if (next === 1.0) {
        setCenterCoord({ cx: SVG_ORIGINAL_W / 2, cy: SVG_ORIGINAL_H / 2 });
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1.0);
    setCenterCoord({ cx: SVG_ORIGINAL_W / 2, cy: SVG_ORIGINAL_H / 2 });
  };

  // Calculate dynamic viewBox
  const viewBoxW = SVG_ORIGINAL_W / zoomScale;
  const viewBoxH = SVG_ORIGINAL_H / zoomScale;
  const viewBoxX = Math.max(0, Math.min(SVG_ORIGINAL_W - viewBoxW, centerCoord.cx - viewBoxW / 2));
  const viewBoxY = Math.max(0, Math.min(SVG_ORIGINAL_H - viewBoxH, centerCoord.cy - viewBoxH / 2));

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Svg
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`}
        style={styles.svg}
      >
        <Defs>
          <RadialGradient id="bg-glow" cx="50%" cy="50%" r="60%">
            <Stop offset="0%" stopColor="rgba(37,99,235,0.22)" />
            <Stop offset="100%" stopColor="rgba(15,23,42,0)" />
          </RadialGradient>
        </Defs>

        {/* Map Background Glow */}
        <Rect width="812" height="872" fill="url(#bg-glow)" rx="24" />

        {/* Render Vietnam Province SVG Outline Paths */}
        <G>
          {VIETNAM_SVG_PATHS.map((prov) => (
            <Path
              key={prov.id}
              d={prov.d}
              fill="rgba(30, 41, 59, 0.45)"
              stroke="#38BDF8"
              strokeWidth={zoomScale > 3.0 ? '0.4' : '0.8'}
              strokeOpacity="0.5"
            />
          ))}
        </G>

        {/* Render Branch Pins & Glowing Markers */}
        <G>
          {branches.map((b) => {
            const { cx, cy } = getBranchSvgCoordinates(b);
            const isSelected = selectedBranchId === b._id;
            const displayName = b.name.replace(/^AutoWash(Pro)?\s*/i, '');

            // Scale pin elements relative to zoom for ultra crisp display
            const outerR = (isSelected ? 16 : 9) / Math.sqrt(zoomScale);
            const coreR = (isSelected ? 7 : 4) / Math.sqrt(zoomScale);
            const auraR = 24 / Math.sqrt(zoomScale);
            const fontSize = Math.max(7, (isSelected ? 14 : 10) / Math.sqrt(zoomScale));

            // Dynamic pill dimensions for label readability
            const labelWidth = Math.max(40, (displayName.length * fontSize * 0.65));
            const labelHeight = fontSize * 1.5;
            const textYOffset = (isSelected ? 18 : 13) / Math.sqrt(zoomScale);

            return (
              <G key={b._id} onPress={() => handleBranchSelect(b)}>
                {/* Active Outer Pulse Aura */}
                {isSelected && (
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={auraR}
                    fill="rgba(37, 99, 235, 0.4)"
                    stroke="#2563EB"
                    strokeWidth={1.8 / zoomScale}
                  />
                )}

                {/* Outer Ring */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={outerR}
                  fill={isSelected ? '#2563EB' : 'rgba(15, 23, 42, 0.9)'}
                  stroke={isSelected ? '#FFFFFF' : '#38BDF8'}
                  strokeWidth={(isSelected ? 2.5 : 1.5) / Math.sqrt(zoomScale)}
                />

                {/* Center Core Dot */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={coreR}
                  fill={isSelected ? '#FFFFFF' : '#38BDF8'}
                />

                {/* Background Pill for Text Label so text is 100% readable without overlapping */}
                <Rect
                  x={cx - labelWidth / 2}
                  y={cy - textYOffset - labelHeight + 2}
                  width={labelWidth}
                  height={labelHeight}
                  rx={labelHeight / 2}
                  fill={isSelected ? '#2563EB' : 'rgba(15, 23, 42, 0.85)'}
                  stroke={isSelected ? '#FFFFFF' : 'rgba(56, 189, 248, 0.3)'}
                  strokeWidth={0.5}
                />

                {/* Branch Label Text */}
                <SvgText
                  x={cx}
                  y={cy - textYOffset - (fontSize * 0.25)}
                  fill="#FFFFFF"
                  fontSize={fontSize}
                  fontWeight={isSelected ? 'bold' : '600'}
                  textAnchor="middle"
                >
                  {displayName}
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>

      {/* Floating Zoom In/Out Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={styles.zoomBtn}
          onPress={handleZoomIn}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.zoomBtn}
          onPress={handleZoomOut}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        {zoomScale > 1.0 && (
          <TouchableOpacity
            style={[styles.zoomBtn, styles.resetBtn]}
            onPress={handleResetZoom}
            activeOpacity={0.7}
          >
            <Ionicons name="locate" size={18} color="#38BDF8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Scale & Gesture Hint Badge */}
      <View style={styles.scaleBadge}>
        <Ionicons name="hand-left-outline" size={12} color="#38BDF8" style={{ marginRight: 4 }} />
        <Text style={styles.scaleBadgeText}>
          {zoomScale > 1.0 ? `Vuốt di chuyển · Zoom: ${zoomScale.toFixed(1)}x / 10x` : 'Kéo / Vuốt để di chuyển bản đồ'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    position: 'relative',
  },
  svg: {
    borderRadius: 16,
  },
  zoomControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.88)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  zoomBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  scaleBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  scaleBadgeText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
});
