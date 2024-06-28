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
        <Dash>
        <DashItem>6</DashItem>
        <DashItem>3</DashItem>
        <DashItem>6</DashItem>
        <DashItem>3</DashItem>
        </Dash>
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
 
</MapStyle>`;

function parseXML(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

         let styles = [];
        const styleNodes = xmlDoc.getElementsByTagName("Style");
        for (let style of styleNodes) {
            let styleObj = {
                name: style.getAttribute("name"),
                type: style.getAttribute("type")
            };

            // 스타일 타입에 따라 적절한 파싱 함수 호출
            if (styleObj.type === "point") {
                console.log('pointlayer')
            } else if (styleObj.type === "line") {
                 console.log('linelayer')
            } else if (styleObj.type === "polygon") {
                console.log('polygonlayer')
            } else if (styleObj.type === "Label") {
             // let a = convertToJSON(style)
                parseLabelLayer(style);
             // const json = JSON.stringify(a);
              
            }
  
            styles.push(styleObj);
        }

  // 각 레이어 태그에 대한 파싱 함수
  function parsePointLayer(pointLayer) {
    // PointLayer 파싱 로직
  }

  function parseLineLayer(lineLayer) {
    // LineLayer 파싱 로직
  }

  function parsePolygonLayer(polygonLayer) {
    // PolygonLayer 파싱 로직
  }
  function parseLabelLayer(xmlNode) {
    const jsonObject = {};

    for(let child of xmlNode.children) {
      let value;

      if(child.children.length > 1)
      {
        const dashItem = [];
        for(const item of child.children) {
          dashItem.push(item.textContent);
        }
        value = dashItem;
      }
      else {
        value = child.textContent;
      }      
      jsonObject[child.tagName] = value;
      console.log(child.tagName + ' : ' + value)
    }
  }

}


parseXML(xmlString);
