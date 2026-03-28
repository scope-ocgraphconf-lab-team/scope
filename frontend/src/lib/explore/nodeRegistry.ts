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
    category: ExploreNodeCategory;
    allowedAssetTypes: readonly AssetType[];
    /** null = not user-placeable (spawned programmatically only) */
    sidebar: { label: string; icon: string; group: SidebarGroup } | null;
}

export const sidebarGroups: Record<SidebarGroup, SidebarGroupMeta> = {
    files: { label: 'File Input', icon: 'file', menuClassName: 'flex flex-row' },
    miners: { label: 'Miner', icon: 'pickaxe', menuClassName: 'flex flex-row flex-wrap' },
};

// satisfies ensures every file/miner node type has a registry entry.
// Visualization nodes are excluded — no component implementations yet.
type RegistrableNodeType = ExploreFileNodeType | ExploreMinerNodeType;

export const nodeRegistry = {
    // ── File nodes ─────────────────────────────────────────────────────────────
    ocptFileNode: {
        category: 'file',
        allowedAssetTypes: ['ocptFile'],
        sidebar: { label: 'OCPT File', icon: 'fileJson', group: 'files' },
    },
    ocelFileNode: {
        category: 'file',
        allowedAssetTypes: ['ocelFile'],
        sidebar: { label: 'OCEL File', icon: 'fileSpreadsheet', group: 'files' },
    },
    ocelCollectionNode: {
        category: 'file',
        allowedAssetTypes: ['ocelCollectionFile'],
        sidebar: null,
    },

    // ── Miner nodes ────────────────────────────────────────────────────────────
    ocptMinerNode: {
        category: 'miner',
        allowedAssetTypes: ['ocelFile'],
        sidebar: { label: 'OCPT Miner', icon: 'treePine', group: 'miners' },
    },
    histogramMinerNode: {
        category: 'miner',
        allowedAssetTypes: ['ocelFile'],
        sidebar: { label: 'Histogram Filter', icon: 'chartBar', group: 'miners' },
    },
    caseNotionMinerNode: {
        category: 'miner',
        allowedAssetTypes: ['ocelFile'],
        sidebar: { label: 'Case Notions', icon: 'waves', group: 'miners' },
    },
    identityExtendMinerNode: {
        category: 'miner',
        allowedAssetTypes: ['ocptAsset', 'ocptFile', 'identityOcptAsset'],
        sidebar: { label: 'Extend Identity', icon: 'fingerprint', group: 'miners' },
    },
} satisfies Record<RegistrableNodeType, NodeRegistryEntry>;
