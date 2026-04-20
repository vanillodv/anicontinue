import { serviceClient } from './guard';

// Записывает admin-действие. Не бросает исключений — при ошибке только console.error,
// чтобы сбой логирования не ломал саму операцию.
export async function logAdminAction(params: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  old?: Record<string, any> | null;
  new?: Record<string, any> | null;
}) {
  try {
    const { error } = await serviceClient().rpc('log_admin_action', {
      p_admin_id: params.adminId,
      p_action: params.action,
      p_target_type: params.targetType,
      p_target_id: params.targetId,
      p_old: params.old ?? null,
      p_new: params.new ?? null,
    });
    if (error) console.error('logAdminAction failed:', error.message);
  } catch (e) {
    console.error('logAdminAction threw:', e);
  }
}
