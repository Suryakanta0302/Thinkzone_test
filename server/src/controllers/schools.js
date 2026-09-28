import School from '../models/School.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listSchools(request, response) {
  const { districtCode, blockCode, clusterCode, includeLocationCodes, search, page, limit } = request.query;
  const filter = {};
  if (districtCode) filter.districtCode = districtCode;
  if (blockCode) filter.blockCode = blockCode;
  if (clusterCode) filter.clusterCode = clusterCode;
  if (search) {
    const term = escapeRegex(search);
    filter.$or = [
      { schoolName: { $regex: term, $options: 'i' } },
      { udiseCode: { $regex: `^${term}`, $options: 'i' } },
    ];
  }
  const listFields = includeLocationCodes
    ? 'udiseCode schoolName clusterName blockName districtCode blockCode'
    : 'udiseCode schoolName clusterName blockName';
  const [schools, total] = await Promise.all([
    School.find(filter)
      .select(`${listFields} -_id`)
      .sort({ schoolName: 1, udiseCode: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    School.countDocuments(filter),
  ]);
  response.json({ items: schools, page, limit, total });
}
