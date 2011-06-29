
	var curLine=1;
	var curUrl=1;
	var fileContents=[];
	var firstResponse = [];
	function saveName(fn,winName){
        
		$("#"+winName).parent().append("<span class='fileName' id="+winName+"'>"+fn+"</span>");
		$("#"+winName).hide();
	}
	function removeFile(fileRemove){
		$(fileRemove).parent().remove();
		
	}
	function removeUrl(fileRemove){
		$(fileRemove).parent().remove();
		
	}
	function showContents(me){
		if (me.contentWindow.location.href.substring(me.contentWindow.location.href.lastIndexOf("/")+1) != "fileFrame.html") {
			//for (n in me.contentWindow.document){
				var de=me.contentWindow.document.documentElement;

				var wname = me.name;				
				if (de.nodeName.substring(0,3).toLowerCase()=="tei"){
					fileContents.push({"name":wname,"file":$(me).next().text(),"text":"<"+de.nodeName+">"+de.innerHTML+"</"+de.nodeName+">"});
				}
				else{
					fileContents.push({"name":wname,"file":$(me).next().text(),"text":de.getElementsByTagName("body")[0].innerHTML});
				}
		}
	}
	function newFileLine(){
	
	fileLine = "<div class='fileLine'><span class='fileBox'><iframe frameborder=0 name='file"+curLine+"' id='file"+curLine+"' class='fileFrame' onload='showContents(this)' src='/frames/fileFrame.html'> </iframe></span><span onclick='removeFile(this)' class='divLink'>Remove</span></div>";
	$("#allFiles").append($(fileLine));
	curLine++;
	return;
	}
	function newUrl(){
		var urlLine = "<div><input type='text' name='url"+curUrl+"' id='url"+curUrl+"' class='textfieldX'/><div id='removeUrl' onclick='removeUrl(this)' class='divLink ui-button-icon-primary ui-icon ui-icon-cancel' style='float: right; margin-right: 15px; margin-top:2px;'></div></div>";
		$("#allUrls").append($(urlLine));
		curUrl++;
	}
	function showSubmitted(){
		
	}
	function parseString(){
		// From http://www.w3schools.com/Xml/xml_parser.asp
		if (window.DOMParser) {
			parser = new DOMParser();
			xmlDoc = parser.parseFromString(txt, "text/xml");
		}
		else // Internet Explorer
		{
			xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
			xmlDoc.async = "false";
			xmlDoc.loadXML(txt);
		}
	}
	function listTexts(name,val,txtjson,targetId){
			
		$("#"+targetId).append("<li id='li_"+name+"'><input type='checkbox' value='"+name+"' name='sel_li_"+name+"' id='sel_li_"+name+"'></input>"+val+"</li>");
		//txtContent = txtStr.substring(txtStr.indexOf("<text"));
		//var teiTexts = txtContent.split("</text>");
		var lastli = $("#li_"+name);
	
		if ((txtjson)&&(txtjson["subtexts"])) {
			$("#li_" + name).append("<ul></ul>");
			for (var j = 0; j < txtjson["subtexts"].length; j++) {
				$("#li_" + name).find("ul").append("<li id='li_" + name + "_" + j + "'><input type='checkbox' value='"+name+"_"+j+"' name='sel_li_" + name + "_" + j + "' id='sel_li_" + name + "_" + j + "'></input>text " + (j+1) + "</li>");
			}
		}
		
	}
	function submitForm(){
		var allData="";
		var uriNames =[];
		var uriVals = [];
		$.each($(".textfieldX"),function(index,value){
			if ($(value).val().length > 0) {
			
				allData = allData + $(value).attr("name") + "=" + $(value).val() + "&";
				uriNames.push($(value).attr("name"));
				uriVals.push($(value).val());
			}
		});
		for (var i=0;i<fileContents.length;i++){
			var allData = allData+fileContents[i].name+"="+fileContents[i].text+"&";
		}
			
		allData = allData.substring(0,allData.length-1);
		
		$.ajax({
			url: "/return_texts",
			data: allData,
			type: "POST",
			success: function(response){
				firstResponse = response;
				
				$("#submittedFileList").html("");
				if ((uriNames.length > 0) || (fileContents.length > 0)) {
					$("#submittedLabel").show();
					if (uriNames.length > 0) {
						for (var i = 0; i < uriNames.length; i++) {
							for (var j = 0; j < response["" + uriNames[i]].length; j++) {
								listTexts(uriNames[i]+"_"+j, uriVals[i]+" "+j+" ", response["" + uriNames[i]][j], "submittedFileList");
							}
						}
					}
					if (fileContents.length > 0) {
						for (var i = 0; i < fileContents.length; i++) {
							for (var j = 0; j < response["" + fileContents[i].name].length; j++) {
								listTexts(fileContents[i].name+"_"+j, fileContents[i].file+" "+j+" ", response["" + fileContents[i].name][j], "submittedFileList");
							}
						}
					}
				}
			}
		});
	}
	function getTokens(){
		fuzzymatch = $("#fuzzymatch").is(':checked');
		collator = $("#collatorUL input:radio:checked").val();
		output = $("#outputUL input:radio:checked").val();
		texts = $("#submittedFileList input:checkbox:checked");
		query = "fuzzymatch="+fuzzymatch+"&output="+output+"&collator="+collator;
		
		for(var i=0;i<texts.length;i++){
			var textName = $(texts[i]).val();
			var textParts = textName.split("_");
			
			var thisUrl = firstResponse[""+textParts[0]]; 
			
			if (textParts.length > 2) {
				thisUrl = thisUrl[parseInt(textParts[1])].subtexts[parseInt(textParts[1])];
				// TODO This needs to pass the entire JSON object, not just the text content!
				query = query + "&" + $(texts[i]).val() + "=" + JSON.stringify(thisUrl);
			}
			else {
				query = query + "&" + $(texts[i]).val() + "=" + JSON.stringify(thisUrl[parseInt(textParts[1])]);
			}
		}
		
			$.ajax({
				"url": "/run_toolchain",
				"data": query,
				"type": "POST",
				"async": false,
				"dataType": "json",
				"success": function(resp){
				        $("#collatedResult").val(resp.result);
					$("#Resultform").attr("action", resp.formaction);
					for (var i=0; i < resp.buttons.length; i++) {
					    $("#resultButton").append("<input type='submit' name='" + i + "' value='" + resp.buttons[i] + "'>");
					}
				}
			});
		
		
	}
	$(document).ready(function(e){
		
		newFileLine();
		newUrl();
		$("#addAnother").click(function(e){
			newFileLine();
		});
		$("#addAnotherUrl").click(function(e){
			newUrl();
		});
		
		
	});
