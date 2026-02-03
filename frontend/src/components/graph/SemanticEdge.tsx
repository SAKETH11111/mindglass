/**
 * SemanticEdge - Custom React Flow edge with semantic meaning
 * 
 * Edge types:
 * - supports (green, thick) - Source supports target's conclusion
 * - refutes (red, thick) - Source contradicts target
 * - depends (blue, dashed) - Source assumes target's premise
 */

import { memo } from 'react';
import { 
  BaseEdge, 
  EdgeLabelRenderer,
  getBezierPath, 
  type EdgeProps 
} from '@xyflow/react';
import { EDGE_COLORS, EDGE_STYLES, type EdgeType } from '@/types/graph';

export interface SemanticEdgeData extends Record<string, unknown> {
  edgeType: EdgeType;
  label?: string;
  animated?: boolean;
}

function SemanticEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeType = (data?.edgeType as EdgeType) || 'depends';
  const color = EDGE_COLORS[edgeType];
  const style = EDGE_STYLES[edgeType];
  const animated = (data?.animated as boolean) ?? true;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25,
  });

  return (
    <>
      {/* Glow effect for emphasis */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: style.strokeWidth + 4,
          strokeDasharray: style.dashArray,
          opacity: 0.2,
          filter: 'blur(4px)',
        }}
      />
      
      {/* Main edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? style.strokeWidth + 1 : style.strokeWidth,
          strokeDasharray: style.dashArray,
          strokeLinecap: 'round',
        }}
        className={animated ? 'react-flow__edge-animated' : ''}
      />

      {/* Optional edge label */}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="absolute text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-white/70 pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {String(data.label)}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Animated particles for active edges */}
      {animated && edgeType === 'supports' && (
        <circle r="3" fill={color}>
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
}

export const SemanticEdge = memo(SemanticEdgeComponent);
