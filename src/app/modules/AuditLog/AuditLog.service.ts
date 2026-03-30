import { Connection } from 'mongoose';
import { QueryBuilder } from '@app/classes/QueryBuilder';
import { getAuditLogModel } from './AuditLog.model';
import { TBrand } from '../auth/auth.interface';

export const AuditLogServices = (connection: Connection, storePreference: TBrand) => {
  const AuditLogModel = getAuditLogModel(connection);

  const getAllLogsFromDB = async (query: Record<string, unknown>) => {
    const auditLogQuery = new QueryBuilder(AuditLogModel, { ...query, storePreference })
      .search(['email', 'resource', 'action'])
      .filter()
      .sort()
      .paginate()
      .limitFields();

    const result = await auditLogQuery.exec();
    const meta = await auditLogQuery.getQueryMeta();

    return { meta, result };
  };

  return { getAllLogsFromDB };
};
