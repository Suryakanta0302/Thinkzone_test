import School from '../models/School.js';
import Visit from '../models/Visit.js';

function visitStatsLookup(blockVariable) {
  const conditions = [
    { $eq: ['$districtCode', '$$district'] },
    { $eq: ['$year', '$$year'] },
    { $eq: ['$month', '$$month'] },
  ];
  if (blockVariable) conditions.push({ $eq: ['$blockCode', `$$${blockVariable}`] });
  return {
    $lookup: {
      from: Visit.collection.name,
      let: {
        district: '$$districtCode',
        year: '$$year',
        month: '$$month',
        ...(blockVariable ? { block: '$blockCode' } : {}),
      },
      pipeline: [
        { $match: { $expr: { $and: conditions } } },
        {
          $group: {
            _id: null,
            schools: { $addToSet: '$udiseCode' },
            users: { $addToSet: '$userId' },
            userSchoolPairs: { $addToSet: { userId: '$userId', udiseCode: '$udiseCode' } },
          },
        },
        {
          $project: {
            _id: 0,
            schoolsVisited: { $size: '$schools' },
            uniqueVisitors: { $size: '$users' },
            visits: { $size: '$userSchoolPairs' },
          },
        },
      ],
      as: 'visitStats',
    },
  };
}

function statProjection() {
  return {
    schoolsVisited: { $ifNull: [{ $arrayElemAt: ['$visitStats.schoolsVisited', 0] }, 0] },
    uniqueVisitors: { $ifNull: [{ $arrayElemAt: ['$visitStats.uniqueVisitors', 0] }, 0] },
    visits: { $ifNull: [{ $arrayElemAt: ['$visitStats.visits', 0] }, 0] },
  };
}

function coverageExpression(schoolsVisited, totalSchools) {
  return {
    $cond: [
      { $gt: [totalSchools, 0] },
      { $round: [{ $multiply: [{ $divide: [schoolsVisited, totalSchools] }, 100] }, 1] },
      0,
    ],
  };
}

export async function getBlockSummary(request, response) {
  const { districtCode, year, month } = request.query;
  const [report] = await School.aggregate([
    { $match: { districtCode } },
    {
      $facet: {
        blocks: [
          {
            $group: {
              _id: '$blockCode',
              blockName: { $first: '$blockName' },
              totalSchools: { $sum: 1 },
            },
          },
          { $set: { blockCode: '$_id' } },
          {
            $set: {
              _reportDistrictCode: districtCode,
              _reportYear: year,
              _reportMonth: month,
            },
          },
          {
            $lookup: {
              from: Visit.collection.name,
              let: { block: '$blockCode' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$districtCode', districtCode] },
                        { $eq: ['$year', year] },
                        { $eq: ['$month', month] },
                        { $eq: ['$blockCode', '$$block'] },
                      ],
                    },
                  },
                },
                {
                  $group: {
                    _id: null,
                    schools: { $addToSet: '$udiseCode' },
                    users: { $addToSet: '$userId' },
                    pairs: { $addToSet: { userId: '$userId', udiseCode: '$udiseCode' } },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    schoolsVisited: { $size: '$schools' },
                    uniqueVisitors: { $size: '$users' },
                    visits: { $size: '$pairs' },
                  },
                },
              ],
              as: 'visitStats',
            },
          },
          {
            $project: {
              _id: 0,
              blockCode: 1,
              blockName: 1,
              totalSchools: 1,
              ...statProjection(),
            },
          },
          {
            $set: {
              coveragePercent: coverageExpression('$schoolsVisited', '$totalSchools'),
            },
          },
          { $sort: { blockName: 1, blockCode: 1 } },
        ],
        district: [
          {
            $group: {
              _id: null,
              totalSchools: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: Visit.collection.name,
              pipeline: [
                {
                  $match: {
                    districtCode,
                    year,
                    month,
                  },
                },
                {
                  $group: {
                    _id: null,
                    schools: { $addToSet: '$udiseCode' },
                    users: { $addToSet: '$userId' },
                    pairs: { $addToSet: { userId: '$userId', udiseCode: '$udiseCode' } },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    schoolsVisited: { $size: '$schools' },
                    uniqueVisitors: { $size: '$users' },
                    visits: { $size: '$pairs' },
                  },
                },
              ],
              as: 'visitStats',
            },
          },
          {
            $project: {
              _id: 0,
              totalSchools: 1,
              ...statProjection(),
            },
          },
          {
            $set: {
              coveragePercent: coverageExpression('$schoolsVisited', '$totalSchools'),
            },
          },
        ],
      },
    },
  ]);

  const districtTotal = report?.district?.[0] ?? {
    totalSchools: 0,
    schoolsVisited: 0,
    uniqueVisitors: 0,
    visits: 0,
    coveragePercent: 0,
  };
  response.json({ districtCode, year, month, blocks: report?.blocks ?? [], districtTotal });
}
