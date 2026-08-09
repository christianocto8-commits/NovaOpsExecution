"use client";

import {
  addEdge,
  MarkerType,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type Viewport,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  WorkflowBuilderNode,
  WorkflowBuilderNodeData,
} from "@/features/workflow-builder/types/builder";
import { serializeWorkflowDraft } from "@/features/workflow-builder/utils/serializer";
import {
  getWorkflowEdgeLabel,
  validateWorkflowConnection,
} from "@/features/workflow-builder/utils/connection-validator";
import { queryKeys } from "@/lib/query/keys";
import {
  builderDocumentService,
  mapBuilderDocumentToDraft,
} from "@/services/builder-document.service";

type AutosaveStatus = "idle" | "saving" | "saved" | "error";

type WorkflowBuilderContextValue = {
  workflowName: string;
  documentId: string | null;
  documentStatus: string;
  nodes: WorkflowBuilderNode[];
  edges: Edge[];
  viewport: Viewport;
  selectedNodeId: string | null;
  selectedNode: WorkflowBuilderNode | null;
  isDirty: boolean;
  isHydrated: boolean;
  isLoadingDocument: boolean;
  backendConnected: boolean;
  autosaveStatus: AutosaveStatus;
  lastSavedAt: string | null;
  connectionMessage: string | null;
  onNodesChange: (changes: NodeChange<WorkflowBuilderNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void;
  connectNodes: (connection: Connection) => void;
  isConnectionValid: (connection: Connection | Edge) => boolean;
  addNode: (node: WorkflowBuilderNode) => void;
  selectNode: (nodeId: string | null) => void;
  updateNodeData: (nodeId: string, updates: Partial<WorkflowBuilderNodeData>) => void;
  updateWorkflowName: (name: string) => void;
  updateViewport: (viewport: Viewport) => void;
  saveDraftNow: () => Promise<void>;
  publishWorkflow: () => Promise<void>;
};

const defaultViewport: Viewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

const initialNodes: WorkflowBuilderNode[] = [
  {
    id: "start-1",
    type: "start",
    position: { x: 160, y: 240 },
    data: {
      label: "Workflow Started",
      description: "Entry point for this workflow.",
      nodeType: "start",
    },
    deletable: false,
  },
  {
    id: "end-1",
    type: "end",
    position: { x: 620, y: 240 },
    data: {
      label: "Workflow Completed",
      description: "Final state after all steps are completed.",
      nodeType: "end",
    },
    deletable: false,
  },
];

const initialEdges: Edge[] = [
  {
    id: "start-1-end-1",
    source: "start-1",
    target: "end-1",
    type: "smoothstep",
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  },
];

export const WorkflowBuilderContext = createContext<WorkflowBuilderContextValue | null>(null);

function isPersistedDocumentId(documentId: string | null | undefined) {
  return Boolean(documentId && /^\d+$/.test(documentId));
}

export function WorkflowBuilderProvider({
  children,
  documentId: initialDocumentId = null,
}: {
  children: ReactNode;
  documentId?: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [documentId, setDocumentId] = useState<string | null>(initialDocumentId);
  const [documentStatus, setDocumentStatus] = useState("draft");
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [nodes, setNodes, applyNodeChanges] = useNodesState<WorkflowBuilderNode>(initialNodes);
  const [edges, setEdges, applyEdgeChanges] = useEdgesState<Edge>(initialEdges);
  const [viewport, setViewport] = useState<Viewport>(defaultViewport);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [hasHydratedDocument, setHasHydratedDocument] = useState(
    !isPersistedDocumentId(initialDocumentId)
  );

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const documentQuery = useQuery({
    queryKey: queryKeys.builder.document(documentId ?? "new"),
    queryFn: () => builderDocumentService.get(documentId!),
    enabled: isPersistedDocumentId(documentId),
    retry: false,
  });

  useEffect(() => {
    setDocumentId(initialDocumentId);
    setHasHydratedDocument(!isPersistedDocumentId(initialDocumentId));
  }, [initialDocumentId]);

  useEffect(() => {
    if (!documentQuery.data) return;

    const draft = mapBuilderDocumentToDraft(documentQuery.data);
    setWorkflowName(draft.name);
    setNodes(draft.nodes.length > 0 ? draft.nodes : initialNodes);
    setEdges(draft.edges.length > 0 ? draft.edges : initialEdges);
    setViewport(draft.viewport);
    setDocumentStatus(documentQuery.data.status);
    setLastSavedAt(draft.updatedAt);
    setIsDirty(false);
    setBackendConnected(true);
    setHasHydratedDocument(true);
  }, [documentQuery.data, setNodes, setEdges]);

  const showConnectionMessage = useCallback((message: string | null) => {
    setConnectionMessage(message);

    if (connectionMessageTimerRef.current) {
      clearTimeout(connectionMessageTimerRef.current);
    }

    if (message) {
      connectionMessageTimerRef.current = setTimeout(() => {
        setConnectionMessage(null);
      }, 3500);
    }
  }, []);

  const persistDraft = useCallback(async (): Promise<string | null> => {
    try {
      setAutosaveStatus("saving");

      const draft = serializeWorkflowDraft({
        workflowId: documentId,
        name: workflowName,
        nodes,
        edges,
        viewport,
      });

      let savedDocumentId = documentId;

      if (isPersistedDocumentId(documentId)) {
        const updated = await builderDocumentService.update(documentId!, draft);
        setDocumentStatus(updated.status);
        savedDocumentId = String(updated.id);
      } else {
        const created = await builderDocumentService.create(draft);
        savedDocumentId = String(created.id);
        setDocumentId(savedDocumentId);
        setDocumentStatus(created.status);
        router.replace(`/dashboard/workflows/builder?document=${savedDocumentId}`);
      }

      setLastSavedAt(new Date().toISOString());
      setIsDirty(false);
      setAutosaveStatus("saved");
      setBackendConnected(true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.builder.documents() });
      return savedDocumentId;
    } catch {
      setAutosaveStatus("error");
      setBackendConnected(false);
      return null;
    }
  }, [documentId, workflowName, nodes, edges, viewport, router, queryClient]);

  useEffect(() => {
    if (!hasHydratedDocument || !isDirty) {
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      void persistDraft();
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [hasHydratedDocument, isDirty, persistDraft]);

  const onNodesChange = useCallback(
    (changes: NodeChange<WorkflowBuilderNode>[]) => {
      applyNodeChanges(changes);

      if (changes.some((change) => change.type !== "select")) {
        setIsDirty(true);
      }

      const removedNodeIds = changes
        .filter((change) => change.type === "remove")
        .map((change) => change.id);

      if (selectedNodeId && removedNodeIds.includes(selectedNodeId)) {
        setSelectedNodeId(null);
      }
    },
    [applyNodeChanges, selectedNodeId]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      applyEdgeChanges(changes);

      if (changes.some((change) => change.type !== "select")) {
        setIsDirty(true);
      }
    },
    [applyEdgeChanges]
  );

  const isConnectionValid = useCallback(
    (connection: Connection | Edge) =>
      validateWorkflowConnection({
        connection: {
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle ?? null,
          targetHandle: connection.targetHandle ?? null,
        },
        nodes,
        edges,
      }).valid,
    [nodes, edges]
  );

  const connectNodes = useCallback(
    (connection: Connection) => {
      const validation = validateWorkflowConnection({
        connection,
        nodes,
        edges,
      });

      if (!validation.valid) {
        showConnectionMessage(validation.message);
        return;
      }

      const sourceNode = nodes.find((node) => node.id === connection.source);

      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            label: getWorkflowEdgeLabel(sourceNode),
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
            style: {
              strokeWidth: 1.5,
            },
            labelStyle: {
              fontSize: 11,
              fontWeight: 600,
            },
          },
          currentEdges
        )
      );

      showConnectionMessage(null);
      setIsDirty(true);
    },
    [edges, nodes, setEdges, showConnectionMessage]
  );

  const addNode = useCallback(
    (node: WorkflowBuilderNode) => {
      const alreadyExists =
        (node.type === "start" || node.type === "end") &&
        nodes.some((currentNode) => currentNode.type === node.type);

      if (alreadyExists) {
        showConnectionMessage(`Only one ${node.type} node is allowed.`);
        return;
      }

      setNodes((currentNodes) => [...currentNodes, node]);
      setSelectedNodeId(node.id);
      setIsDirty(true);
    },
    [nodes, setNodes, showConnectionMessage]
  );

  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, updates: Partial<WorkflowBuilderNodeData>) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...updates,
                },
              }
            : node
        )
      );

      setIsDirty(true);
    },
    [setNodes]
  );

  const updateWorkflowName = useCallback((name: string) => {
    setWorkflowName(name);
    setIsDirty(true);
  }, []);

  const updateViewport = useCallback((nextViewport: Viewport) => {
    setViewport(nextViewport);
  }, []);

  const saveDraftNow = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    await persistDraft();
  }, [persistDraft]);

  const publishWorkflow = useCallback(async () => {
    const savedDocumentId = await persistDraft();

    if (!savedDocumentId || !isPersistedDocumentId(savedDocumentId)) {
      return;
    }

    const published = await builderDocumentService.publish(savedDocumentId);
    setDocumentStatus(published.status);
    setBackendConnected(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.builder.documents() });
  }, [persistDraft, queryClient]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const value = useMemo<WorkflowBuilderContextValue>(
    () => ({
      workflowName,
      documentId,
      documentStatus,
      nodes,
      edges,
      viewport,
      selectedNodeId,
      selectedNode,
      isDirty,
      isHydrated: hasHydratedDocument,
      isLoadingDocument: documentQuery.isLoading,
      backendConnected,
      autosaveStatus,
      lastSavedAt,
      connectionMessage,
      onNodesChange,
      onEdgesChange,
      connectNodes,
      isConnectionValid,
      addNode,
      selectNode,
      updateNodeData,
      updateWorkflowName,
      updateViewport,
      saveDraftNow,
      publishWorkflow,
    }),
    [
      workflowName,
      documentId,
      documentStatus,
      nodes,
      edges,
      viewport,
      selectedNodeId,
      selectedNode,
      isDirty,
      hasHydratedDocument,
      documentQuery.isLoading,
      backendConnected,
      autosaveStatus,
      lastSavedAt,
      connectionMessage,
      onNodesChange,
      onEdgesChange,
      connectNodes,
      isConnectionValid,
      addNode,
      selectNode,
      updateNodeData,
      updateWorkflowName,
      updateViewport,
      saveDraftNow,
      publishWorkflow,
    ]
  );

  return (
    <WorkflowBuilderContext.Provider value={value}>{children}</WorkflowBuilderContext.Provider>
  );
}
