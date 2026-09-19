import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { 
  Briefcase, 
  Mail, 
  User, 
  Link as LinkIcon, 
  Globe, 
  Network, 
  Paperclip,
  X,
  AlertCircle
} from 'lucide-react';

const NODE_CONFIG = {
  case: { icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  email: { icon: Mail, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  sender: { icon: User, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  url: { icon: LinkIcon, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  domain: { icon: Globe, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  ip: { icon: Network, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  attachment: { icon: Paperclip, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  default: { icon: Network, color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/30' }
};

const CustomNode = ({ data, isConnectable }) => {
  const config = NODE_CONFIG[data.nodeType?.toLowerCase()] || NODE_CONFIG.default;
  const Icon = config.icon;
  const isShared = data.isShared;

  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 bg-gray-900 transition-all ${config.border} ${isShared ? 'ring-2 ring-primary ring-offset-2 ring-offset-gray-900 shadow-primary/50' : 'hover:border-gray-500'}`}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 !bg-gray-500" />
      <div className="flex items-center">
        <div className={`rounded-full w-8 h-8 flex items-center justify-center ${config.bg} ${config.color} mr-3`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{data.nodeType}</span>
          <span className="text-sm font-bold text-white max-w-[150px] truncate" title={data.label}>{data.label}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 !bg-gray-500" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 220;
const nodeHeight = 60;

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  dagreGraph.setGraph({ rankdir: direction, ranksep: 80, nodesep: 50 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = direction === 'TB' ? 'top' : 'left';
    node.sourcePosition = direction === 'TB' ? 'bottom' : 'right';

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
    return node;
  });

  return { nodes, edges };
};

const RelationshipGraph = ({ caseId }) => {
  const { token } = useAuth();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    fetchGraphData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      let url = `${API_BASE_URL}/api/graph`;
      if (caseId) url += `?caseId=${caseId}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch graph data');
      
      const data = await res.json();
      
      if (!data.nodes || data.nodes.length === 0) {
        setNodes([]);
        setEdges([]);
        setLoading(false);
        return;
      }

      // Calculate node degrees to find shared nodes
      const nodeDegrees = {};
      data.edges.forEach(edge => {
        nodeDegrees[edge.source] = (nodeDegrees[edge.source] || 0) + 1;
        nodeDegrees[edge.target] = (nodeDegrees[edge.target] || 0) + 1;
      });

      // Format nodes for React Flow
      const initialNodes = data.nodes.map(n => ({
        id: n.id,
        type: 'custom',
        data: { 
          label: n.label, 
          nodeType: n.type,
          isShared: (nodeDegrees[n.id] || 0) > 1,
          originalId: n.id
        },
        position: { x: 0, y: 0 } // Will be calculated by dagre
      }));

      const initialEdges = data.edges.map(e => ({
        id: e.id || `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#4b5563', strokeWidth: 1.5 },
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const closePanel = () => {
    setSelectedNode(null);
  };

  if (loading) {
    return (
      <div className="h-full flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Network className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">No Analysis Data Yet</h2>
        <p className="text-gray-400 max-w-md">
          The relationship graph builds automatically as you analyze emails. Go to Cases and analyze some emails to see their shared infrastructure and relationships here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] relative border border-gray-800 rounded-xl overflow-hidden bg-gray-900/50 shadow-xl">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
        minZoom={0.1}
        maxZoom={1.5}
      >
        <Background color="#374151" gap={16} size={1} />
        <Controls className="bg-gray-800 border-gray-700 fill-white !text-white" />
        <MiniMap 
          nodeColor={(n) => {
            const config = NODE_CONFIG[n.data.nodeType?.toLowerCase()] || NODE_CONFIG.default;
            return config.color.includes('purple') ? '#a855f7' :
                   config.color.includes('blue') ? '#3b82f6' :
                   config.color.includes('green') ? '#22c55e' :
                   config.color.includes('red') ? '#ef4444' :
                   config.color.includes('orange') ? '#f97316' :
                   config.color.includes('yellow') ? '#eab308' :
                   config.color.includes('cyan') ? '#06b6d4' : '#9ca3af';
          }}
          maskColor="rgba(17, 24, 39, 0.7)"
          className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden"
        />

        {/* Legend Panel */}
        <Panel position="top-left" className="bg-gray-900/90 border border-gray-800 rounded-lg p-3 shadow-lg backdrop-blur-sm m-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Legend</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {Object.entries(NODE_CONFIG).map(([type, config]) => {
              if (type === 'default') return null;
              const Icon = config.icon;
              return (
                <div key={type} className="flex items-center text-sm">
                  <Icon className={`w-4 h-4 mr-2 ${config.color}`} />
                  <span className="text-gray-300 capitalize">{type}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800 flex items-center text-sm text-gray-300">
            <div className="w-4 h-4 rounded-full border-2 border-primary ring-2 ring-primary/30 mr-2 bg-gray-800"></div>
            Shared Resource
          </div>
        </Panel>
      </ReactFlow>

      {/* Selected Node Sidebar/Panel */}
      {selectedNode && (
        <div className="absolute top-4 right-4 w-80 bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl backdrop-blur-md animate-in slide-in-from-right-4 p-5 z-10">
          <button 
            onClick={closePanel}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center mb-4">
            {(() => {
              const config = NODE_CONFIG[selectedNode.data.nodeType?.toLowerCase()] || NODE_CONFIG.default;
              const Icon = config.icon;
              return (
                <div className={`rounded-full w-12 h-12 flex items-center justify-center ${config.bg} ${config.color} mr-4`}>
                  <Icon className="w-6 h-6" />
                </div>
              );
            })()}
            <div>
              <div className="text-xs text-primary uppercase tracking-wider font-bold mb-1">
                {selectedNode.data.nodeType}
              </div>
              <h3 className="text-lg font-semibold text-white break-all">
                {selectedNode.data.label}
              </h3>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <span className="text-xs text-gray-500 uppercase">Node ID</span>
              <p className="text-sm font-mono text-gray-300 break-all">{selectedNode.data.originalId}</p>
            </div>
            
            {selectedNode.data.isShared && (
              <div className="bg-primary/10 rounded-lg p-3 border border-primary/20 flex items-start">
                <Network className="w-4 h-4 text-primary mr-2 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-primary uppercase">Shared Infrastructure</span>
                  <p className="text-xs text-gray-300 mt-1">This node appears in multiple relationships across your investigations, indicating shared infrastructure.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RelationshipGraph;
