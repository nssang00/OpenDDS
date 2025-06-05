┌─────────────┐   per-segment (instance) buffer
│ p0.xy       │
│ p1.xy       │
│ angles.xy   │  joinAngleStart, joinAngleEnd
│ lengthInfo  │  measureStart/End
│ width, etc. │
└─────────────┘   stride = 32 B

┌─────────────┐   static vertex buffer (4 verts)
│ offset.xy   │  (-1,+1),(+1,+1),(-1,-1),(+1,-1)
└─────────────┘
