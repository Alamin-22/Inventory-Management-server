import { QueryBuilder } from '@app/classes/QueryBuilder';
import { AuditLogModel } from './AuditLog.model';

const getAllLogsFromDB = async (query: Record<string, unknown>) => {
  const auditLogQuery = new QueryBuilder(AuditLogModel, query)
    .search(['email', 'resource', 'action'])
    .filter()
    .sort()
    .paginate()
    .limitFields();

  const result = await auditLogQuery.exec();
  const meta = await auditLogQuery.getQueryMeta();

  return { meta, result };
};

export const AuditLogServices = {
  getAllLogsFromDB,
};
