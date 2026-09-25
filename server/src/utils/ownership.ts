// Dữ liệu dùng chung (food, exercise): bản ghi hệ thống có createdBy = null,
// bản ghi custom chỉ chủ sở hữu mới thấy
export function visibleToUser(userId: string) {
  return { $or: [{ createdBy: null }, { createdBy: userId }] };
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
