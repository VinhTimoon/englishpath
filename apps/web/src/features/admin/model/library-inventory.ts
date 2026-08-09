export type LibraryInventoryItem = {
  id: string;
  title: string;
  contentType: string;
  sourceType: string;
  checksum: string;
  sourceVersion: string;
  rightsState: string;
  reviewState: string;
  publishState: string;
  canReview: boolean;
  canPublish: boolean;
};

export type LibraryInventory = { data: LibraryInventoryItem[] };
