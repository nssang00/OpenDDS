<!DOCTYPE html>
<html>
  <head>
    <title>JavaScript Sandbox</title>
    <meta charset="UTF-8" />
  </head>

  <body>
    <div id="app"></div>
    <script>
const xmlString = `<MapStyle Version="1.0">	
<Style name="BB010T03" type="Label">
		<Font>굴림</Font>
		<Size>8</Size>
		<Color>255, 97, 17, 146</Color>
		<Bold>false</Bold>
		<Italic>false</Italic>
		<Underline>false</Underline>
		<OffsetX>23</OffsetX>
		<OffsetY>-2</OffsetY>
		<Align>4</Align>
	</Style>
	<Style name="Agg" type="point">
		<OffsetX>0</OffsetX>
		<OffsetY>0</OffsetY>
		<PointLayer type="PICTURE">
			<Picture>ddd.png</Picture>
		</PointLayer>
	</Style>
	<Style name="Adfs" type="line">
		<LineLayer type="DASH">
			<Color>255, 0, 0, 0</Color>
			<Width>1</Width>
			<JoinType>2</JoinType>
			<Dash>
				<DashItem>6</DashItem>
				<DashItem>3</DashItem>
				<DashItem>6</DashItem>
				<DashItem>3</DashItem>
			</Dash>
		</LineLayer>
		<LineLayer type="PICTURE">
			<Picture>dfd.png</Picture>
			<TextureLine>false</TextureLine>
			<Width>8</Width>
		</LineLayer>		
	</Style>
	<Style name="AL015A08" type="polygon">
		<PolygonLayer type="SIMPLE">
			<Color>255, 255, 255, 255</Color>
			<Transparent>true</Transparent>
			<LineLayer type="PICTURE">
				<Picture>No_Fish.png</Picture>
				<TextureLine>false</TextureLine>
			</LineLayer>
		</PolygonLayer>
  </Style>
</MapStyle>`;

const xmlString2 = `<MapLayer Version="1.0">
	<Layer Category="경계" Name="해안선" FACC="BA010" GeometryType="Line" SHPSource="LBA010" GDBSource="CoastL" Map="250K,500K,1M" DisplayType="Geometry">
		<Feature Name="사구" Description="설명" GeometryStyle="BA010L01">
			<VVTStyle ACC="0" SLT="0,10,11,13"></VVTStyle>
		</Feature>
		<Feature Name="사구" Description="설명" GeometryStyle="BA010L02">
			<VVTStyle ACC="0" SLT="0,10,11,13"></VVTStyle>
		</Feature>
	</Layer>
	<Layer Category="고도" Name="표고점" FACC="CA030" GeometryType="Point" SHPSource="PCA010" GDBSource="ElevP" Map="250K,500K,1M" DisplayType="Both" LabelColumn="ZV2">
		<Feature Name="명확한 표고점" Description="설명" GeometryStyle="CA030P01" LabelStyle="CA030T01">
			<VVTStyle ACC="1" ELA="0,2"></VVTStyle>
		</Feature>
		<Feature Name="명확한 표고점" Description="설명" GeometryStyle="CA030P01" LabelStyle="CA030T02">
			<VVTStyle ACC="1" ELA="0,2"></VVTStyle>
		</Feature>		
	</Layer>
	<Group Category="연안수부지물" Name="간석지" GeometryType="Point">
    <Layer Category="수부" Name="암초" FACC="BD130" GeometryType="Point" SHPSource="PBD130" GDBSource="DangerP" Map="250K,500K,1M" DisplayType="Geometry">
		<Feature Name="수상암초" Description="설명" GeometryStyle="BD130P01">
			<VVTStyle VRR="0,1,8"></VVTStyle>
		</Feature>
		<Feature Name="수중암초" Description="설명" GeometryStyle="BD130P02">
			<VVTStyle VRR="2,4"></VVTStyle>
		</Feature>		
	</Layer>	    
	</Group>  
</MapLayer>`;



function parseXML(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  let styles = [];
  //const styleNodes = xmlDoc.getElementsByTagName("Style");

  for (let styleNode of xmlDoc.getElementsByTagName("Style")) {
    let styleObj = {
      name: styleNode.getAttribute("name"),
      type: styleNode.getAttribute("type"),
    };
    let symbolizers;
    switch (styleObj.type) {
      case "point":
        symbolizers = parsePointLayers(styleNode);
        break;
      case "line":
        symbolizers = parseLineLayers(styleNode);
        break;
      case "polygon":
        symbolizers = parsePolygonLayers(styleNode);
        break;
      case "Label":
        symbolizers = parseLabelLayers(styleNode);
        break;
      default:
        break;
    }
    Object.assign(styleObj, symbolizers);
    styles.push(styleObj);
  }

  return styles;

  function parsePointLayers(styleNode) {

    const symbolizers = [];

    for (const layerNode of styleNode.getElementsByTagName("PointLayer")) {
      const layerObj = { type: layerNode.getAttribute("type") };

      for (const child of layerNode.children) {
        if (child.children.length === 0) {
          layerObj[child.tagName] = child.textContent;
        }
      }

      symbolizers.push(layerObj);
    }

    return {
      OffsetX: styleNode.getElementsByTagName("OffsetX")[0].textContent,
      OffsetY: styleNode.getElementsByTagName("OffsetX")[0].textContent,
      symbolizers: symbolizers
    };    
  }

  function parseLineLayers(styleNode) {

    const symbolizers = [];
    for (const layerNode of styleNode.getElementsByTagName("LineLayer")) {
      const layerObj = { type: layerNode.getAttribute("type") };

      for (const child of layerNode.children) {
        if (child.children.length === 0) {
          layerObj[child.tagName] = child.textContent;
        } else {
          layerObj[child.tagName] = [];
          for (const item of child.children) {
            layerObj[child.tagName].push(item.textContent);
          }
        }
      }

      symbolizers.push(layerObj);
    }

    return {
      symbolizers: symbolizers
    };      
  }

  function parseLabelLayers(styleNode) {

    let styleObj = {};
    for (let child of styleNode.children) {
      if (child.children.length === 0) {
        styleObj[child.tagName] = child.textContent;
      } else {
        styleObj[child.tagName] = [];
        for (const item of child.children) {
          styleObj[child.tagName].push(item.textContent);
        }
      }
    }

    return {
      symbolizers: [styleObj]
    };   
  }


  function parsePolygonLayers(styleNode) {

    const symbolizers = [];
    for (const layerNode of styleNode.getElementsByTagName("PolygonLayer")) {
      const layerObj = { type: layerNode.getAttribute("type") };
      for (const child of layerNode.children) {
        if (child.children.length === 0) {
          layerObj[child.tagName] = child.textContent;
        } 
      }
      Object.assign(layerObj, parseLineLayers(layerNode));

      symbolizers.push(layerObj);
    }
    return {
      symbolizers: symbolizers
    };      
  }

}


function parseXML2(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  const layers = [];
  const groups = [];

  for (const child of xmlDoc.documentElement.children) {
    if (child.nodeName === "Group") {
      groups.push(parseGroup(child));
    } else if (child.nodeName === "Layer") {
      layers.push(parseLayer(child));
    }
  }

  return {
    layers,
    groups
  };

  function parseGroup(groupNode) {

    const groupObj = {};
    for(const attr of groupNode.attributes) {
      groupObj[attr.name] = attr.value;
    }

    groupObj.layers = [];
    for (let layerNode of groupNode.children) {
      groupObj.layers.push(parseLayer(layerNode));
    } 
    return groupObj;
  }

  function parseLayer(layerNode) {

    const layerObj = {};
    for(const attr of layerNode.attributes) {
      layerObj[attr.name] = attr.value;
    }
    
    layerObj.features = [];
    for (let featureNode of layerNode.children) {
      layerObj.features.push(parseFeature(featureNode));
    } 

    return layerObj;
  }  

  function parseFeature(featureNode) {

    const featureObj = {};
    for(const attr of featureNode.attributes) {
      featureObj[attr.name] = attr.value;
    }
    for (const child of featureNode.children) {
      const filterObj = {};
      for(const attr of child.attributes) {
        filterObj[attr.name] = attr.value;
      }
      featureObj[child.tagName] = filterObj;
    }

    return featureObj; 
  }
}

let results = parseXML(xmlString);

console.log(JSON.stringify(results, null, 2));

let results2 = parseXML2(xmlString2);

console.log(JSON.stringify(results2, null, 2));

    </script>
  </body>
</html>
