import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';
import { Record, RecordSchema } from '../src/api/schemas/record.schema';

dotenv.config();

async function explainRecordQuery() {
  if (!process.env.MONGO_URL) {
    throw new Error('MONGO_URL is required to run record query explain');
  }

  await mongoose.connect(process.env.MONGO_URL);
  const recordModel = mongoose.model<Record>('Record', RecordSchema);
  await recordModel.syncIndexes();

  const explain = (await recordModel
    .find({ format: 'Vinyl', category: 'Rock' })
    .sort({ createdAt: -1, _id: -1 })
    .limit(20)
    .explain('executionStats')) as any;

  console.log(JSON.stringify(explain.executionStats, null, 2));
  await mongoose.disconnect();
}

explainRecordQuery().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
