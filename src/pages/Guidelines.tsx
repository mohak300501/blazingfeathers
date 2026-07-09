import React from 'react'

const guidelines = [
  'No birding at the expense of the well-being/security of birds.',
  'Use of any external noise-producing or bird-call-producing device/app (like Merlin) to attract birds is prohibited.',
  'Maintain a safe distance from birds so as not to stress/scare them.',
  'No interference with the nests of birds. Maintain a minimum safe distance of 10m from the nests to avoid disturbance.',
  'No branches/leaves around nests will be removed for photography.',
  'Avoid approaching birds in a way that forces them to flee or fly away.',
  'No food materials will be used to attract birds, although waterbaths are encouraged during scarcity in summer.',
  'Minimize pigeon feeding. Exposure to pigeon droppings can cause respiratory diseases like hypersensitivity pneumonitis.',
  'Littering is prohibited. Pick up your own waste responsibly.',
  'Collecting any wildlife products as feathers, nests, eggs, etc., is prohibited.',
  'Use of drones without permission is prohibited.',
  'Consumption of any intoxicants by group members is strictly prohibited.',
  'No damage will be caused to rivers, streams, trees, plants, and wildlife.',
  'Group members will fully comply with the Indian Forest Act, 1972, the Wildlife (Protection) Act, 1972, and all other relevant legal provisions, rules, and instructions.',
  'Any illegal hunting, arson, etc., should be reported to the competent authority.'
]

const Guidelines = () => (
  <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
    <h1 className="section-header text-center mb-6">Guidelines</h1>
    <p className="text-gray-700 mb-4">
      Please follow these guidelines to ensure ethical, safe, and enjoyable bird-watching for all, and to protect our avian friends and their habitats:
    </p>
    <ul className="list-disc pl-6 space-y-2 text-gray-800">
      {guidelines.map((g, i) => <li key={i}>{g}</li>)}
    </ul>
    <p className="text-gray-500 text-sm mt-6">
      These include official guidelines published by the Government of Uttarakhand (2023) for conservation, adapted for the urban context of Roorkee.
    </p>
  </div>
)

export default Guidelines 