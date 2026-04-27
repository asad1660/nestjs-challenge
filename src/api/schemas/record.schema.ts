import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RecordFormat, RecordCategory } from './record.enum';

export type RecordDocument = HydratedDocument<Record>;

export class Track {
  @Prop({ required: true })
  position: string;

  @Prop({ required: true })
  title: string;
}

@Schema({ timestamps: true })
export class Record {
  @Prop({ required: true })
  artist: string;

  @Prop({ required: true })
  album: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  qty: number;

  @Prop({ enum: RecordFormat, required: true })
  format: RecordFormat;

  @Prop({ enum: RecordCategory, required: true })
  category: RecordCategory;

  @Prop({ required: false })
  mbid?: string;

  @Prop({
    type: [{ position: { type: String }, title: { type: String } }],
    default: [],
  })
  tracklist: Track[];

  @Prop({ required: false })
  musicBrainzFetchedAt?: Date;

  @Prop({ required: false })
  musicBrainzError?: string;

  createdAt: Date;

  updatedAt: Date;
}

export const RecordSchema = SchemaFactory.createForClass(Record);

RecordSchema.index({ artist: 'text', album: 'text', category: 'text' });
RecordSchema.index({ format: 1, category: 1, createdAt: -1, _id: -1 });
RecordSchema.index({ artist: 1, album: 1, format: 1 }, { unique: true });
