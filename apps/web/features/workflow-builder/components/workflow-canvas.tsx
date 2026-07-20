"use client";

import {
  useCallback,
  type DragEvent,
} from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type NodeTypes,
  useReactFlow,
} from "@xyflow/react";

import { createLocalId } from "@/lib/local-id";
import { useWorkflowBuilder } from "@/features/workflow-builder/hooks/use-workflow-builder";
import { ApprovalNode } from "@/features/workflow-builder/nodes/approval-node";
import { EndNode } from "@/features/workflow-builder/nodes/end-node";
import { StartNode } from "@/features/workflow-builder/nodes/start-node";
import { WorkflowStepNode } from "@/features/workflow-builder/nodes/workflow-step-node";
import {
  getWorkflowNodeDefinition,
  WORKFLOW_NODE_DRAG_TYPE,
} from "@/features/workflow-builder/registry/node-registry";
import type {
  WorkflowBuilderNode,
  WorkflowBuilderNodeType,
} from "@/features/workflow-builder/types/builder";

const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  approval: ApprovalNode,
  condition: WorkflowStepNode,
  notification: WorkflowStepNode,
  escalation: WorkflowStepNode,
  delay: WorkflowStepNode,
  task: WorkflowStepNode,
  form: WorkflowStepNode,
};

function createNodeId(
  nodeType: WorkflowBuilderNodeType
) {
  return `${nodeType}-${createLocalId()}`;
}

function WorkflowCanvasContent() {
  const {
    screenToFlowPosition,
    setViewport,
  } = useReactFlow<WorkflowBuilderNode, Edge>();

  const {
    nodes,
    edges,
    viewport,
    isHydrated,
    onNodesChange,
    onEdgesChange,
    connectNodes,
    isConnectionValid,
    addNode,
    selectNode,
    updateViewport,
  } = useWorkflowBuilder();

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    []
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const nodeType =
        event.dataTransfer.getData(
          WORKFLOW_NODE_DRAG_TYPE
        ) as WorkflowBuilderNodeType;

      if (!nodeType) {
        return;
      }

      const definition =
        getWorkflowNodeDefinition(nodeType);

      if (!definition) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode({
        id: createNodeId(nodeType),
        type: nodeType,
        position,
        data: {
          label: definition.label,
          description: definition.description,
          nodeType,
          approval:
            nodeType === "approval"
              ? {
                  approverType: "role",
                  approverLabel: "Outlet Manager",
                  approvalMode: "single",
                  slaHours: 24,
                }
              : undefined,
        },
      });
    },
    [addNode, screenToFlowPosition]
  );

  if (!isHydrated) {
    return (
      <div className="flex h-full min-h-[640px] items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          Loading workflow draft...
        </p>
      </div>
    );
  }

  return (
    <div
      className="h-full min-h-[640px] w-full overflow-hidden bg-slate-50"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={connectNodes}
        isValidConnection={isConnectionValid}
        onNodeClick={(_, node) =>
          selectNode(node.id)
        }
        onPaneClick={() => selectNode(null)}
        onMoveEnd={(_, nextViewport) =>
          updateViewport(nextViewport)
        }
        onInit={() => {
          void setViewport(viewport);
        }}
        minZoom={0.25}
        maxZoom={2}
        snapToGrid
        snapGrid={[20, 20]}
        panOnScroll
        selectionOnDrag
        deleteKeyCode={["Backspace", "Delete"]}
        defaultEdgeOptions={{
          type: "smoothstep",
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        }}
        proOptions={{
          hideAttribution: true,
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.25}
        />

        <Controls
          position="bottom-left"
          showInteractive={false}
        />

        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          className="!border !border-slate-200 !bg-white"
        />
      </ReactFlow>
    </div>
  );
}

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasContent />
    </ReactFlowProvider>
  );
}


