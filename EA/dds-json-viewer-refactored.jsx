import { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";

/**
 * DDS JSON Visual Viewer / Editor
 *
 * Design goals reflected in this version:
 * 1. Keep the DDS JSON model as the source of truth.
 * 2. Normalize raw DDS-JSON into a stable view model.
 * 3. Use xyflow only as one renderer, not as the whole application model.
 * 4. Render `types` as UML-like diagrams.
 * 5. Render `qos` as editable configuration cards backed by top-level state.
 * 6. Keep room for JSON Schema validation, raw JSON, diff, export, and schema-driven forms.
 */

// ─── Sample DDS JSON data ───────────────────────────────────────────────────

const SAMPLE_RAW_DDS_JSON = {
  types: {
    dds: {
      types: [
        {
          kind: "struct",
          name: "ShapeType",
          members: [
            { name: "color", type: { kind: "alias", name: "string" } },
            { name: "x", type: { kind: "primitive", name: "int32" } },
            { name: "y", type: { kind: "primitive", name: "int32" } },
            { name: "shapesize", type: { kind: "primitive", name: "int32" } },
          ],
        },
        {
          kind: "enum",
          name: "StatusKind",
          values: [
            { name: "ALIVE", value: 0 },
            { name: "NOT_ALIVE_DISPOSED", value: 1 },
            { name: "NOT_ALIVE_NO_WRITERS", value: 2 },
          ],
        },
        {
          kind: "struct",
          name: "SampleInfo",
          members: [
            { name: "sample_state", type: { kind: "alias", name: "StatusKind" } },
            { name: "valid_data", type: { kind: "primitive", name: "boolean" } },
            { name: "source_timestamp", type: { kind: "primitive", name: "int64" } },
          ],
        },
      ],
    },
  },
  qos: {
    dds: {
      qos_profile_library: [
        {
          name: "BuiltinQosLib",
          qos_profile: [
            {
              name: "Generic.StrictReliable",
              reliability: { kind: "RELIABLE", max_blocking_time: "100ms" },
              history: { kind: "KEEP_LAST", depth: 1 },
              durability: { kind: "VOLATILE" },
              deadline: { period: "INFINITE" },
              lifespan: { duration: "INFINITE" },
            },
            {
              name: "Generic.BestEffort",
              reliability: { kind: "BEST_EFFORT" },
              history: { kind: "KEEP_LAST", depth: 1 },
              durability: { kind: "VOLATILE" },
            },
          ],
        },
      ],
    },
  },
  domains: {
    dds: {
      domain_library: [
        {
          name: "MyDomainLibrary",
          domain: [
            {
              name: "MyDomain",
              domain_id: 0,
              register_type: [{ name: "ShapeType", type_ref: "ShapeType" }],
              topic: [
                { name: "Square", register_type_ref: "ShapeType" },
                { name: "Circle", register_type_ref: "ShapeType" },
              ],
            },
          ],
        },
      ],
    },
  },
  domainparticipants: {
    dds: {
      domain_participant_library: [
        {
          name: "MyParticipantLibrary",
          domain_participant: [
            {
              name: "PublicationParticipant",
              domain_ref: "MyDomainLibrary::MyDomain",
              publisher: [
                {
                  name: "MyPublisher",
                  data_writer: [
                    {
                      name: "SquareWriter",
                      topic_ref: "Square",
                      qos_profile_ref: "BuiltinQosLib::Generic.StrictReliable",
                    },
                  ],
                },
              ],
            },
            {
              name: "SubscriptionParticipant",
              domain_ref: "MyDomainLibrary::MyDomain",
              subscriber: [
                {
                  name: "MySubscriber",
                  data_reader: [
                    {
                      name: "SquareReader",
                      topic_ref: "Square",
                      qos_profile_ref: "BuiltinQosLib::Generic.BestEffort",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
};

// ─── Color tokens ────────────────────────────────────────────────────────────

const COLORS = {
  bg: "#0f1117",
  surface: "#1a1d27",
  surface2: "#141722",
  border: "#2a2d3e",
  accent: "#6366f1",
  accentSoft: "#6366f120",
  green: "#22d3a5",
  greenSoft: "#22d3a510",
  amber: "#f59e0b",
  amberSoft: "#f59e0b12",
  rose: "#f43f5e",
  roseSoft: "#f43f5e10",
  sky: "#38bdf8",
  skySoft: "#38bdf810",
  text: "#e2e8f0",
  textMuted: "#64748b",
  textDim: "#94a3b8",
  error: "#fb7185",
};

// ─── Building block metadata ────────────────────────────────────────────────

const BUILDING_BLOCKS = {
  types: {
    key: "types",
    label: "Types",
    icon: "🧩",
    color: COLORS.accent,
    defaultView: "diagram",
    availableViews: ["diagram", "json"],
    desc: "UML struct / enum view",
  },
  qos: {
    key: "qos",
    label: "QoS",
    icon: "⚙️",
    color: COLORS.green,
    defaultView: "form",
    availableViews: ["form", "json"],
    desc: "Editable profile settings",
  },
  domains: {
    key: "domains",
    label: "Domains",
    icon: "🌐",
    color: COLORS.sky,
    defaultView: "diagram",
    availableViews: ["diagram", "json"],
    desc: "Domain / topic registry",
  },
  domainparticipants: {
    key: "domainparticipants",
    label: "Participants",
    icon: "🔗",
    color: COLORS.rose,
    defaultView: "diagram",
    availableViews: ["diagram", "json"],
    desc: "Pub/Sub data flow",
  },
};

const BUILDING_BLOCK_ORDER = ["types", "qos", "domains", "domainparticipants"];

// ─── Normalizer ──────────────────────────────────────────────────────────────

function normalizeDdsJson(raw) {
  return {
    types: normalizeTypes(raw.types),
    qosProfiles: normalizeQos(raw.qos),
    domains: normalizeDomains(raw.domains),
    participants: normalizeParticipants(raw.domainparticipants),
  };
}

function normalizeTypes(typesBlock) {
  const types = typesBlock?.dds?.types || [];
  return types.map((type) => ({
    id: `type:${type.name}`,
    kind: type.kind,
    name: type.name,
    members: type.members || [],
    values: type.values || [],
    raw: type,
  }));
}

function normalizeQos(qosBlock) {
  const libs = qosBlock?.dds?.qos_profile_library || [];
  return libs.flatMap((library) =>
    (library.qos_profile || []).map((profile) => ({
      id: `qos:${library.name}::${profile.name}`,
      libraryName: library.name,
      name: profile.name,
      profile,
    }))
  );
}

function normalizeDomains(domainsBlock) {
  const libs = domainsBlock?.dds?.domain_library || [];
  return libs.flatMap((library) =>
    (library.domain || []).map((domain) => {
      const registeredTypes = domain.register_type || [];
      const topics = (domain.topic || []).map((topic) => ({
        name: topic.name,
        typeRef:
          registeredTypes.find((registered) => registered.name === topic.register_type_ref)?.type_ref ||
          topic.register_type_ref,
      }));

      return {
        id: `domain:${library.name}::${domain.name}`,
        libraryName: library.name,
        name: domain.name,
        domainId: domain.domain_id,
        topics,
        raw: domain,
      };
    })
  );
}

function normalizeParticipants(participantsBlock) {
  const libs = participantsBlock?.dds?.domain_participant_library || [];

  return libs.flatMap((library) =>
    (library.domain_participant || []).map((participant) => {
      const writers = (participant.publisher || []).flatMap((publisher) =>
        (publisher.data_writer || []).map((writer) => ({
          direction: "write",
          owner: publisher.name,
          name: writer.name,
          topicRef: writer.topic_ref,
          qosProfileRef: writer.qos_profile_ref,
        }))
      );

      const readers = (participant.subscriber || []).flatMap((subscriber) =>
        (subscriber.data_reader || []).map((reader) => ({
          direction: "read",
          owner: subscriber.name,
          name: reader.name,
          topicRef: reader.topic_ref,
          qosProfileRef: reader.qos_profile_ref,
        }))
      );

      return {
        id: `participant:${library.name}::${participant.name}`,
        libraryName: library.name,
        name: participant.name,
        domainRef: participant.domain_ref,
        endpoints: [...writers, ...readers],
        raw: participant,
      };
    })
  );
}

// ─── Immutable raw JSON updates ──────────────────────────────────────────────

function updateQosProfile(rawJson, profileId, updater) {
  const [, qualifiedName] = profileId.split("qos:");
  const [libraryName, ...profileNameParts] = qualifiedName.split("::");
  const profileName = profileNameParts.join("::");

  return {
    ...rawJson,
    qos: {
      ...rawJson.qos,
      dds: {
        ...rawJson.qos?.dds,
        qos_profile_library: (rawJson.qos?.dds?.qos_profile_library || []).map((library) => {
          if (library.name !== libraryName) return library;

          return {
            ...library,
            qos_profile: (library.qos_profile || []).map((profile) => {
              if (profile.name !== profileName) return profile;
              return updater(profile);
            }),
          };
        }),
      },
    },
  };
}

function setNestedValue(target, path, value) {
  if (!path.length) return value;
  const [head, ...rest] = path;
  return {
    ...target,
    [head]: setNestedValue(target?.[head] ?? {}, rest, value),
  };
}

// ─── Validation placeholder ─────────────────────────────────────────────────

function validateDdsViewModel(viewModel) {
  /**
   * Replace this lightweight validation with AJV validation against:
   * - dds-json_types.schema.json
   * - dds-json_qos.schema.json
   * - dds-json_domains.schema.json
   * - dds-json_domainparticipants.schema.json
   */
  const errors = [];

  viewModel.qosProfiles.forEach((item) => {
    const reliabilityKind = item.profile.reliability?.kind;
    if (reliabilityKind && !["RELIABLE", "BEST_EFFORT"].includes(reliabilityKind)) {
      errors.push({
        block: "qos",
        path: `${item.libraryName}::${item.name}.reliability.kind`,
        message: `Unsupported reliability kind: ${reliabilityKind}`,
      });
    }

    const history = item.profile.history;
    if (history?.kind === "KEEP_LAST" && (!Number.isInteger(history.depth) || history.depth < 1)) {
      errors.push({
        block: "qos",
        path: `${item.libraryName}::${item.name}.history.depth`,
        message: "KEEP_LAST history requires depth >= 1.",
      });
    }
  });

  return errors;
}

// ─── Nodes ──────────────────────────────────────────────────────────────────

function TypeNode({ data }) {
  const isEnum = data.kind === "enum";
  const color = isEnum ? COLORS.amber : COLORS.accent;

  return (
    <div style={cardStyle(color, { minWidth: 230, fontFamily: "'JetBrains Mono', 'Fira Code', monospace" })}>
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <Handle type="source" position={Position.Right} style={{ background: color }} />

      <NodeHeader
        color={color}
        eyebrow={`«${isEnum ? "enumeration" : "struct"}»`}
        title={data.name}
      />

      <div style={{ padding: "6px 0" }}>
        {isEnum
          ? data.values.map((value, index) => (
              <Row key={value.name} isLast={index === data.values.length - 1}>
                <span style={{ color: COLORS.text, fontSize: 11 }}>{value.name}</span>
                <span style={{ color, fontSize: 11 }}>{value.value}</span>
              </Row>
            ))
          : data.members.map((member, index) => (
              <Row key={member.name} isLast={index === data.members.length - 1}>
                <span style={{ color: COLORS.textDim, fontSize: 11 }}>+ {member.name}</span>
                <span style={{ color: COLORS.green, fontSize: 11 }}>{member.type?.name}</span>
              </Row>
            ))}
      </div>
    </div>
  );
}

function QosNode({ data }) {
  const profile = data.profile;
  const onProfileChange = data.onProfileChange;

  const update = useCallback(
    (path, value) => {
      onProfileChange(data.id, path, value);
    },
    [data.id, onProfileChange]
  );

  const reliabilityColor = profile.reliability?.kind === "RELIABLE" ? COLORS.green : COLORS.amber;

  return (
    <div style={cardStyle(COLORS.green, { minWidth: 290 })}>
      <Handle type="target" position={Position.Left} style={{ background: COLORS.green }} />
      <Handle type="source" position={Position.Right} style={{ background: COLORS.green }} />

      <NodeHeader
        color={COLORS.green}
        icon="⚙️"
        eyebrow="QoS Profile"
        title={data.name}
        subtitle={data.libraryName}
      />

      <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {profile.reliability && (
          <QosField label="Reliability">
            <Select
              value={profile.reliability.kind}
              options={["RELIABLE", "BEST_EFFORT"]}
              color={reliabilityColor}
              onChange={(value) => update(["reliability", "kind"], value)}
            />
            {profile.reliability.kind === "RELIABLE" && (
              <TextInput
                value={profile.reliability.max_blocking_time || ""}
                placeholder="max blocking time"
                onChange={(value) => update(["reliability", "max_blocking_time"], value)}
              />
            )}
          </QosField>
        )}

        {profile.history && (
          <QosField label="History">
            <Select
              value={profile.history.kind}
              options={["KEEP_LAST", "KEEP_ALL"]}
              color={COLORS.sky}
              onChange={(value) => update(["history", "kind"], value)}
            />
            {profile.history.kind === "KEEP_LAST" && (
              <NumberInput
                value={profile.history.depth ?? 1}
                min={1}
                label="depth"
                onChange={(value) => update(["history", "depth"], value)}
              />
            )}
          </QosField>
        )}

        {profile.durability && (
          <QosField label="Durability">
            <Select
              value={profile.durability.kind}
              options={["VOLATILE", "TRANSIENT_LOCAL", "TRANSIENT", "PERSISTENT"]}
              color={COLORS.rose}
              onChange={(value) => update(["durability", "kind"], value)}
            />
          </QosField>
        )}

        {profile.deadline && (
          <QosField label="Deadline">
            <TextInput
              value={profile.deadline.period || ""}
              onChange={(value) => update(["deadline", "period"], value)}
            />
          </QosField>
        )}
      </div>
    </div>
  );
}

function DomainNode({ data }) {
  return (
    <div style={cardStyle(COLORS.sky, { minWidth: 240 })}>
      <Handle type="target" position={Position.Left} style={{ background: COLORS.sky }} />
      <Handle type="source" position={Position.Right} style={{ background: COLORS.sky }} />

      <NodeHeader
        color={COLORS.sky}
        icon="🌐"
        eyebrow="Domain"
        title={data.name}
        subtitle={`ID: ${data.domainId}`}
      />

      <div style={{ padding: "8px 12px" }}>
        <SectionLabel>Topics</SectionLabel>
        {data.topics.map((topic) => (
          <PillRow key={topic.name} color={COLORS.sky} left={topic.name} right={topic.typeRef} />
        ))}
      </div>
    </div>
  );
}

function ParticipantNode({ data }) {
  const writes = data.endpoints.filter((endpoint) => endpoint.direction === "write");
  const reads = data.endpoints.filter((endpoint) => endpoint.direction === "read");
  const isPublisherOnly = writes.length > 0 && reads.length === 0;
  const color = isPublisherOnly ? COLORS.accent : COLORS.rose;
  const icon = isPublisherOnly ? "📤" : "📥";

  return (
    <div style={cardStyle(color, { minWidth: 250 })}>
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <Handle type="source" position={Position.Right} style={{ background: color }} />

      <NodeHeader color={color} icon={icon} eyebrow="DomainParticipant" title={data.name} subtitle={data.domainRef} />

      <div style={{ padding: "8px 12px" }}>
        {writes.length > 0 && (
          <>
            <SectionLabel>DataWriters</SectionLabel>
            {writes.map((endpoint) => (
              <EndpointRow key={endpoint.name} endpoint={endpoint} color={COLORS.accent} />
            ))}
          </>
        )}
        {reads.length > 0 && (
          <>
            <SectionLabel>DataReaders</SectionLabel>
            {reads.map((endpoint) => (
              <EndpointRow key={endpoint.name} endpoint={endpoint} color={COLORS.rose} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function LibraryNode({ data }) {
  return (
    <div
      style={{
        background: "transparent",
        border: `1.5px dashed ${COLORS.border}`,
        borderRadius: 12,
        padding: "10px 14px",
        minWidth: 180,
      }}
    >
      <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
        📚 {data.label}
      </div>
    </div>
  );
}

const nodeTypes = {
  typeNode: TypeNode,
  qosNode: QosNode,
  domainNode: DomainNode,
  participantNode: ParticipantNode,
  libraryNode: LibraryNode,
};

// ─── Graph builders ─────────────────────────────────────────────────────────

function buildTypesGraph(viewModel) {
  const nodes = viewModel.types.map((type, index) => ({
    id: type.id,
    type: "typeNode",
    position: { x: (index % 3) * 300, y: Math.floor(index / 3) * 220 },
    data: type,
  }));

  const typeNameSet = new Set(viewModel.types.map((type) => type.name));
  const edges = [];

  viewModel.types.forEach((type) => {
    type.members.forEach((member) => {
      const referencedTypeName = member.type?.name;
      if (!typeNameSet.has(referencedTypeName)) return;

      edges.push({
        id: `field-reference:${type.name}:${member.name}:${referencedTypeName}`,
        source: type.id,
        target: `type:${referencedTypeName}`,
        data: { relation: "field-reference" },
        animated: false,
        style: { stroke: COLORS.accent, strokeDasharray: "4 2" },
        label: member.name,
        labelStyle: { fill: COLORS.textMuted, fontSize: 9 },
        labelBgStyle: { fill: COLORS.bg },
      });
    });
  });

  return { nodes, edges };
}

function buildQosGraph(viewModel, onProfileChange) {
  const grouped = groupBy(viewModel.qosProfiles, (profile) => profile.libraryName);
  const nodes = [];
  const edges = [];
  let x = 0;

  Object.entries(grouped).forEach(([libraryName, profiles]) => {
    nodes.push({
      id: `qos-library:${libraryName}`,
      type: "libraryNode",
      position: { x: -20, y: -60 },
      data: { label: libraryName },
      draggable: false,
      selectable: false,
    });

    profiles.forEach((profile, index) => {
      nodes.push({
        id: profile.id,
        type: "qosNode",
        position: { x, y: index * 270 },
        data: { ...profile, onProfileChange },
      });
      x += 330;
    });
  });

  return { nodes, edges };
}

function buildDomainsGraph(viewModel) {
  const nodes = viewModel.domains.map((domain, index) => ({
    id: domain.id,
    type: "domainNode",
    position: { x: 0, y: index * 260 },
    data: domain,
  }));

  return { nodes, edges: [] };
}

function buildParticipantsGraph(viewModel) {
  const nodes = viewModel.participants.map((participant, index) => ({
    id: participant.id,
    type: "participantNode",
    position: { x: index * 310, y: 0 },
    data: participant,
  }));

  const writers = viewModel.participants.flatMap((participant) =>
    participant.endpoints
      .filter((endpoint) => endpoint.direction === "write")
      .map((endpoint) => ({ participant, endpoint }))
  );

  const readers = viewModel.participants.flatMap((participant) =>
    participant.endpoints
      .filter((endpoint) => endpoint.direction === "read")
      .map((endpoint) => ({ participant, endpoint }))
  );

  const edges = [];
  writers.forEach((writer) => {
    readers.forEach((reader) => {
      if (writer.endpoint.topicRef !== reader.endpoint.topicRef) return;

      edges.push({
        id: `topic-flow:${writer.endpoint.name}:${reader.endpoint.name}`,
        source: writer.participant.id,
        target: reader.participant.id,
        data: { relation: "topic-flow", topicRef: writer.endpoint.topicRef },
        animated: true,
        style: { stroke: COLORS.green, strokeWidth: 1.5 },
        label: writer.endpoint.topicRef,
        labelStyle: { fill: COLORS.green, fontSize: 9 },
        labelBgStyle: { fill: COLORS.bg },
      });
    });
  });

  return { nodes, edges };
}

// ─── Renderer components ────────────────────────────────────────────────────

function DiagramView({ graph }) {
  return <FlowCanvas key={graph.cacheKey} initialNodes={graph.nodes} initialEdges={graph.edges} />;
}

function JsonView({ value }) {
  return (
    <pre
      style={{
        margin: 0,
        height: "100%",
        overflow: "auto",
        padding: 18,
        background: COLORS.bg,
        color: COLORS.textDim,
        fontSize: 12,
        lineHeight: 1.55,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function QosFormView({ profiles, onProfileChange }) {
  return (
    <div style={{ height: "100%", overflow: "auto", padding: 20, background: COLORS.bg }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 14 }}>
        {profiles.map((profile) => (
          <QosProfilePanel key={profile.id} item={profile} onProfileChange={onProfileChange} />
        ))}
      </div>
    </div>
  );
}

function QosProfilePanel({ item, onProfileChange }) {
  const profile = item.profile;

  const update = useCallback(
    (path, value) => {
      onProfileChange(item.id, path, value);
    },
    [item.id, onProfileChange]
  );

  return (
    <div style={{ ...cardStyle(COLORS.green), boxShadow: "none" }}>
      <NodeHeader color={COLORS.green} icon="⚙️" eyebrow={item.libraryName} title={item.name} />
      <div style={{ padding: 14, display: "grid", gap: 12 }}>
        {profile.reliability && (
          <FormRow label="Reliability">
            <Select
              value={profile.reliability.kind}
              options={["RELIABLE", "BEST_EFFORT"]}
              color={profile.reliability.kind === "RELIABLE" ? COLORS.green : COLORS.amber}
              onChange={(value) => update(["reliability", "kind"], value)}
            />
            {profile.reliability.kind === "RELIABLE" && (
              <TextInput
                value={profile.reliability.max_blocking_time || ""}
                placeholder="max_blocking_time"
                onChange={(value) => update(["reliability", "max_blocking_time"], value)}
              />
            )}
          </FormRow>
        )}

        {profile.history && (
          <FormRow label="History">
            <Select
              value={profile.history.kind}
              options={["KEEP_LAST", "KEEP_ALL"]}
              color={COLORS.sky}
              onChange={(value) => update(["history", "kind"], value)}
            />
            {profile.history.kind === "KEEP_LAST" && (
              <NumberInput
                value={profile.history.depth ?? 1}
                min={1}
                label="depth"
                onChange={(value) => update(["history", "depth"], value)}
              />
            )}
          </FormRow>
        )}

        {profile.durability && (
          <FormRow label="Durability">
            <Select
              value={profile.durability.kind}
              options={["VOLATILE", "TRANSIENT_LOCAL", "TRANSIENT", "PERSISTENT"]}
              color={COLORS.rose}
              onChange={(value) => update(["durability", "kind"], value)}
            />
          </FormRow>
        )}

        {profile.deadline && (
          <FormRow label="Deadline">
            <TextInput value={profile.deadline.period || ""} onChange={(value) => update(["deadline", "period"], value)} />
          </FormRow>
        )}
      </div>
    </div>
  );
}

function FlowCanvas({ initialNodes, initialEdges }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      style={{ background: COLORS.bg }}
    >
      <Background color={COLORS.border} gap={24} size={1} />
      <Controls style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
      <MiniMap
        style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        nodeColor={(node) => {
          if (node.type === "typeNode") return COLORS.accent;
          if (node.type === "qosNode") return COLORS.green;
          if (node.type === "domainNode") return COLORS.sky;
          if (node.type === "participantNode") return COLORS.rose;
          return COLORS.border;
        }}
      />
    </ReactFlow>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [rawJson, setRawJson] = useState(SAMPLE_RAW_DDS_JSON);
  const [activeBlock, setActiveBlock] = useState("types");
  const [viewModeByBlock, setViewModeByBlock] = useState(() =>
    Object.fromEntries(BUILDING_BLOCK_ORDER.map((key) => [key, BUILDING_BLOCKS[key].defaultView]))
  );

  const viewModel = useMemo(() => normalizeDdsJson(rawJson), [rawJson]);
  const validationErrors = useMemo(() => validateDdsViewModel(viewModel), [viewModel]);

  const onProfileChange = useCallback((profileId, path, value) => {
    setRawJson((prev) =>
      updateQosProfile(prev, profileId, (profile) => setNestedValue(profile, path, value))
    );
  }, []);

  const graphs = useMemo(
    () => ({
      types: { ...buildTypesGraph(viewModel), cacheKey: `types:${rawJson.types?.dds?.types?.length || 0}` },
      qos: { ...buildQosGraph(viewModel, onProfileChange), cacheKey: `qos:${JSON.stringify(rawJson.qos)}` },
      domains: { ...buildDomainsGraph(viewModel), cacheKey: `domains:${rawJson.domains?.dds?.domain_library?.length || 0}` },
      domainparticipants: {
        ...buildParticipantsGraph(viewModel),
        cacheKey: `domainparticipants:${rawJson.domainparticipants?.dds?.domain_participant_library?.length || 0}`,
      },
    }),
    [viewModel, rawJson, onProfileChange]
  );

  const activeMeta = BUILDING_BLOCKS[activeBlock];
  const activeViewMode = viewModeByBlock[activeBlock];

  const setActiveViewMode = useCallback(
    (mode) => {
      setViewModeByBlock((prev) => ({ ...prev, [activeBlock]: mode }));
    },
    [activeBlock]
  );

  return (
    <div style={{ width: "100vw", height: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif" }}>
      <Header
        activeBlock={activeBlock}
        activeMeta={activeMeta}
        activeViewMode={activeViewMode}
        viewModel={viewModel}
        validationErrors={validationErrors}
        onBlockChange={setActiveBlock}
        onViewModeChange={setActiveViewMode}
      />

      <main style={{ flex: 1, position: "relative", minHeight: 0 }}>
        {activeBlock === "qos" && activeViewMode === "form" && (
          <QosFormView profiles={viewModel.qosProfiles} onProfileChange={onProfileChange} />
        )}

        {activeBlock !== "qos" && activeViewMode === "diagram" && <DiagramView graph={graphs[activeBlock]} />}

        {activeBlock === "qos" && activeViewMode === "diagram" && <DiagramView graph={graphs.qos} />}

        {activeViewMode === "json" && <JsonView value={getRawBlock(rawJson, activeBlock)} />}
      </main>
    </div>
  );
}

function Header({
  activeBlock,
  activeMeta,
  activeViewMode,
  viewModel,
  validationErrors,
  onBlockChange,
  onViewModeChange,
}) {
  return (
    <header
      style={{
        padding: "12px 20px",
        borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexShrink: 0,
      }}
    >
      <div>
        <div style={{ color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>OMG DDS-JSON</div>
        <div style={{ color: COLORS.text, fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>Visual Schema Explorer</div>
      </div>

      <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
        {BUILDING_BLOCK_ORDER.map((key) => {
          const block = BUILDING_BLOCKS[key];
          const isActive = activeBlock === key;

          return (
            <button
              key={key}
              onClick={() => onBlockChange(key)}
              style={tabButtonStyle(block.color, isActive)}
            >
              <span>{block.icon}</span>
              {block.label}
              <CountBadge count={getCountForBlock(viewModel, key)} color={isActive ? block.color : COLORS.textMuted} />
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        {activeMeta.availableViews.map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            style={viewModeButtonStyle(activeMeta.color, activeViewMode === mode)}
          >
            {mode}
          </button>
        ))}
      </div>

      <div
        style={{
          background: validationErrors.length ? `${COLORS.error}16` : `${activeMeta.color}15`,
          border: `1px solid ${validationErrors.length ? COLORS.error : activeMeta.color}30`,
          color: validationErrors.length ? COLORS.error : activeMeta.color,
          borderRadius: 6,
          padding: "4px 10px",
          fontSize: 10,
          whiteSpace: "nowrap",
        }}
        title={validationErrors.map((error) => `${error.path}: ${error.message}`).join("\n")}
      >
        {validationErrors.length ? `${validationErrors.length} validation issue(s)` : activeMeta.desc}
      </div>
    </header>
  );
}

// ─── Small UI components ────────────────────────────────────────────────────

function NodeHeader({ color, icon, eyebrow, title, subtitle }) {
  return (
    <div
      style={{
        background: `${color}14`,
        borderBottom: `1px solid ${color}30`,
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
      <div style={{ minWidth: 0 }}>
        <div style={{ color: COLORS.textMuted, fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>{eyebrow}</div>
        <div style={{ color, fontSize: 12, fontWeight: 700, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        {subtitle && <div style={{ color: COLORS.textMuted, fontSize: 9, marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function Row({ children, isLast }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 12px",
        borderBottom: isLast ? "none" : `1px solid ${COLORS.border}`,
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ color: COLORS.textMuted, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{children}</div>;
}

function QosField({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <SectionLabel>{label}</SectionLabel>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function FormRow({ label, children }) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "110px 1fr", alignItems: "center", gap: 10 }}>
      <span style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 0.5 }}>{label}</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{children}</div>
    </label>
  );
}

function Select({ value, options, color, onChange }) {
  return (
    <select
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      className="nodrag"
      style={{
        background: `${color}15`,
        border: `1px solid ${color}40`,
        color,
        borderRadius: 5,
        padding: "4px 7px",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        outline: "none",
      }}
    >
      {options.map((option) => (
        <option key={option} value={option} style={{ background: COLORS.surface, color: COLORS.text }}>
          {option}
        </option>
      ))}
    </select>
  );
}

function NumberInput({ value, onChange, label, min }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {label && <span style={{ color: COLORS.textMuted, fontSize: 10 }}>{label}:</span>}
      <input
        type="number"
        value={value}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        className="nodrag"
        style={{
          width: 58,
          background: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          color: COLORS.sky,
          borderRadius: 4,
          padding: "4px 6px",
          fontSize: 11,
          outline: "none",
        }}
      />
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="nodrag"
      style={{
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        color: COLORS.textDim,
        borderRadius: 4,
        padding: "4px 7px",
        fontSize: 11,
        outline: "none",
        minWidth: 110,
      }}
    />
  );
}

function PillRow({ color, left, right }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 8px",
        marginBottom: 4,
        background: `${color}08`,
        border: `1px solid ${color}20`,
        borderRadius: 6,
      }}
    >
      <span style={{ color, fontSize: 10 }}>◈</span>
      <span style={{ color: COLORS.text, fontSize: 11 }}>{left}</span>
      <span style={{ color: COLORS.textMuted, fontSize: 10, marginLeft: "auto" }}>{right}</span>
    </div>
  );
}

function EndpointRow({ endpoint, color }) {
  return (
    <div
      style={{
        padding: "6px 8px",
        marginBottom: 4,
        background: `${color}08`,
        border: `1px solid ${color}20`,
        borderRadius: 6,
      }}
    >
      <div style={{ color, fontSize: 11, fontWeight: 600 }}>{endpoint.name}</div>
      <div style={{ color: COLORS.textMuted, fontSize: 9, marginTop: 2 }}>
        topic: <span style={{ color: COLORS.sky }}>{endpoint.topicRef}</span>
        {endpoint.qosProfileRef && (
          <span style={{ marginLeft: 8 }}>
            qos: <span style={{ color: COLORS.green }}>{endpoint.qosProfileRef.split("::").at(-1)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function CountBadge({ count, color }) {
  return (
    <span
      style={{
        border: `1px solid ${color}30`,
        color,
        borderRadius: 999,
        padding: "0 6px",
        fontSize: 10,
        lineHeight: "16px",
      }}
    >
      {count}
    </span>
  );
}

// ─── Style helpers ──────────────────────────────────────────────────────────

function cardStyle(color, overrides = {}) {
  return {
    background: COLORS.surface,
    border: `1.5px solid ${color}`,
    borderRadius: 10,
    boxShadow: `0 0 20px ${color}15`,
    overflow: "hidden",
    fontFamily: "system-ui, sans-serif",
    ...overrides,
  };
}

function tabButtonStyle(color, active) {
  return {
    background: active ? `${color}18` : "transparent",
    border: `1px solid ${active ? color : COLORS.border}`,
    color: active ? color : COLORS.textMuted,
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "all .15s",
  };
}

function viewModeButtonStyle(color, active) {
  return {
    background: active ? `${color}16` : COLORS.surface2,
    border: `1px solid ${active ? color : COLORS.border}`,
    color: active ? color : COLORS.textMuted,
    borderRadius: 7,
    padding: "5px 9px",
    cursor: "pointer",
    fontSize: 11,
    textTransform: "capitalize",
  };
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function groupBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    acc[key] ||= [];
    acc[key].push(item);
    return acc;
  }, {});
}

function getRawBlock(rawJson, blockKey) {
  return rawJson[blockKey];
}

function getCountForBlock(viewModel, key) {
  switch (key) {
    case "types":
      return viewModel.types.length;
    case "qos":
      return viewModel.qosProfiles.length;
    case "domains":
      return viewModel.domains.length;
    case "domainparticipants":
      return viewModel.participants.length;
    default:
      return 0;
  }
}
