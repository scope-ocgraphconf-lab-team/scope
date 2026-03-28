import type { ComponentType } from 'react';
import type { NodeProps } from '@xyflow/react';
import OcelCollectionNode from '~/components/explore/file/OcelCollectionNode';
import OcelFileNode from '~/components/explore/file/OcelFileNode';
import OcptFileNode from '~/components/explore/file/OcptFileNode';
import CaseNotionMinerNode from '~/components/explore/miner/CaseNotionMinerNode';
import ExtendWithIdentityNode from '~/components/explore/miner/ExtendWithIdentityNode';
import HistogramMinerNode from '~/components/explore/miner/HistogramMinerNode';
import OcptMinerNode from '~/components/explore/miner/OcptMinerNode';
import type {
    ExploreFileNodeType,
    ExploreMinerNodeType,
    ExploreNodeCategory,
} from '~/types/explore/nodeTypesCategories';
import type { AssetType } from '~/types/files.types';

export type SidebarGroup = 'files' | 'miners';

export interface SidebarGroupMeta {
    label: string;
    icon: string;
    menuClassName: string;
}

export interface NodeRegistryEntry {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: ComponentType<NodeProps<any>>;
    category: ExploreNodeCategory;
    allowedAssetTypes: readonly AssetType[];
    // NULL case is for the OcelCollectionNode which can only be spawned through code
    sidebar: { label: string; icon: string; group: SidebarGroup } | null;
}

export const sidebarGroups: Record<SidebarGroup, SidebarGroupMeta> = {
    files: { label: 'File Input', icon: 'file', menuClassName: 'flex flex-row' },
    miners: { label: 'Miner', icon: 'pickaxe', menuClassName: 'flex flex-row flex-wrap' },
};

// Ensures every file/miner node type has a registry entry.
type RegistrableNodeType = ExploreFileNodeType | ExploreMinerNodeType;

export const nodeRegistry = {
    // ── File nodes ─────────────────────────────────────────────────────────────
    ocptFileNode: {
        component: OcptFileNode,
        category: 'file',
        allowedAssetTypes: ['ocptFile'],
        sidebar: { label: 'OCPT File', icon: 'fileJson', group: 'files' },
    },
    ocelFileNode: {
        component: OcelFileNode,
        category: 'file',
        allowedAssetTypes: ['ocelFile'],
        sidebar: { label: 'OCEL File', icon: 'fileSpreadsheet', group: 'files' },
    },
    ocelCollectionNode: {
        component: OcelCollectionNode,
        category: 'file',
        allowedAssetTypes: ['ocelCollectionFile'],
        sidebar: null,
    },

    // ── Miner nodes ────────────────────────────────────────────────────────────
    ocptMinerNode: {
        component: OcptMinerNode,
        category: 'miner',
        allowedAssetTypes: ['ocelFile'],
        sidebar: { label: 'OCPT Miner', icon: 'treePine', group: 'miners' },
    },
    histogramMinerNode: {
        component: HistogramMinerNode,
        category: 'miner',
        allowedAssetTypes: ['ocelFile'],
        sidebar: { label: 'Histogram Filter', icon: 'chartBar', group: 'miners' },
    },
    caseNotionMinerNode: {
        component: CaseNotionMinerNode,
        category: 'miner',
        allowedAssetTypes: ['ocelFile'],
        sidebar: { label: 'Case Notions', icon: 'waves', group: 'miners' },
    },
    identityExtendMinerNode: {
        component: ExtendWithIdentityNode,
        category: 'miner',
        allowedAssetTypes: ['ocptAsset', 'ocptFile', 'identityOcptAsset'],
        sidebar: { label: 'Extend Identity', icon: 'fingerprint', group: 'miners' },
    },
} satisfies Record<RegistrableNodeType, NodeRegistryEntry>;
