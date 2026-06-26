export interface NetworkGraphModel {
  nodes: NetworkNode[];
  links: NetworkLink[];
  groups: NetworkGroup[];
  rootNodeId?: string;
  subfolders: Record<string, NetworkSubfolder>;
}

export interface NetworkNode {
  id: string;
  label: string;
  type?: string;
  group?: string;
  color?: string;
  icon?: string;
  metadata: Record<string, unknown>;
  x?: number;
  y?: number;
  fixed?: boolean;
  parentId?: string;
  isRoot: boolean;
}

export interface NetworkLink {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
  weight?: number;
  metadata: Record<string, unknown>;
}

export interface NetworkGroup {
  id: string;
  label: string;
  color?: string;
  metadata: Record<string, unknown>;
}

export interface NetworkSubfolder {
  parentId: string;
  nodes: NetworkNode[];
  links: NetworkLink[];
}
