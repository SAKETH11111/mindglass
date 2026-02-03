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
}: EdgeProps) {
  const edgeType = (data?.edgeType as EdgeType) || 'depends';
  const color = EDGE_COLORS[edgeType];
  const style = EDGE_STYLES[edgeType];

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
      {/* Main edge - solid visible line */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: 2,
          strokeDasharray: style.dashArray,
          strokeLinecap: 'round',
          opacity: 1,
        }}
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
    </>
  );
}

export const SemanticEdge = memo(SemanticEdgeComponent);
