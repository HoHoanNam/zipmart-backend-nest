import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum CmsPageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

/**
 * The page itself never stores title/content directly — those live on
 * immutable `CmsPageVersion` snapshots (see that entity). `currentVersionId`
 * is the only mutable pointer: "editing" a page means creating a brand new
 * version row and re-pointing this, never touching an existing version.
 */
@Entity('cms_pages')
export class CmsPage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  slug!: string;

  @Column({ type: 'enum', enum: CmsPageStatus, default: CmsPageStatus.DRAFT })
  status!: CmsPageStatus;

  /** Null only in the instant between creating the page row and saving its first version — every page has exactly one current version in practice. */
  @Column({ name: 'current_version_id', type: 'uuid', nullable: true })
  currentVersionId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
