export type CmsTaxonomyNode = {
  id: string;
  parentId: string | null;
  level: string;
  topic: string;
  subtopic: string | null;
  collocations: string[];
  relatedSkills: string[];
  tracks: string[];
  toeicParts: number[];
};

export type CmsVersion = {
  id: string;
  contentId: string;
  previousVersionId: string | null;
  clientRequestId: string;
  contentType: string;
  title: string;
  body: string;
  provenance: string;
  usageScope: string;
  accessTier: string;
  taxonomyNodeId: string;
  source: { sourceId: string; checksum: string; sourceVersion: string };
  governance: {
    licenseStatus: string;
    reviewStatus: string;
    publishStatus: string;
    reviewedAt: string | null;
    publishedAt: string | null;
  };
};

export type CmsTaxonomyPage = {
  data: CmsTaxonomyNode[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasNext: boolean;
  };
};

export type CmsMutation = {
  data: CmsVersion;
  idempotencyStatus: "created" | "replayed";
};
