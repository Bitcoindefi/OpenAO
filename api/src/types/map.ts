export enum MapStatus {
    DRAFT = 'draft',
    PROPOSED = 'proposed',
    IN_REVIEW = 'in_review',
    PUBLISHED = 'published',
    REJECTED = 'rejected'
}

export interface MapValidationResult {
    isValid: boolean;
    errors: string[];
}
