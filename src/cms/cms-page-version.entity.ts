import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Immutable snapshot — once saved, a version row is never updated, only ever superseded by a new one (`CmsPage.currentVersionId` re-pointed to it). Gives every page a full, unambiguous edit history for free. */
@Entity('cms_page_versions')
export class CmsPageVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'page_id', type: 'uuid' })
  pageId!: string;

  @Column({ type: 'varchar' })
  title!: string;

  /** Rich HTML from the admin-web `ngx-quill` editor — rendered as-is by the public page, so the editor is the only thing responsible for producing safe markup. */
  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
