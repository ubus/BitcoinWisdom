// ==UserScript==
// @name           	BitcoinWisdom
// @description		BitcoinWisdom
// @namespace      http://bitcoinwisdom.com*
// @include      http://bitcoinwisdom.com*
// ==/UserScript==



var main = function () {
	$(document).ready(function ($) {
		$('body').css({overflow:'auto'});
		
		/*****************************
		******************************
		USUNIĘCIE REKLAMY
		******************************
		*****************************/
		$('#leftbar_outer').remove();
		
		/*****************************
		******************************
		TRYB MINIWYKRESÓW
		******************************
		*****************************/
		
		if (window.location.search.indexOf('mikrochart') > 0){
			// $('#header_outer').remove();
			$('#header_outer .nav .logo').remove();
			var tt = $('#header_outer .nav .ticker');
			for (var i = 0; i<tt.length; i++){
				var thtml = tt.eq(i).html();
				tt.eq(i).remove();
				$('<li>').attr({class:'ticker'}).html(thtml).appendTo($('#header_outer .nav'));
			}
			
			$('#header_outer .nav .ticker span').remove();
			$('#header_outer .navbar .nav li').css({marginRight:8});
			var tb = $('#header_outer .nav .ticker b');
			for (var i = 0; i<tb.length; i++){
				tb.eq(i).html(tb.eq(i).html().replace(':', ''))
			}
			
			var ta = $('#header_outer .nav a');
			for (var i = 0; i<ta.length; i++){
				var href = ta.eq(i).attr('href');
				ta.eq(i).attr({href:href+'?mikrochart'});
			}
			
			$('#periods li:first-child').remove();
			$('#periods li:first-child').remove();
			$('#nav-charts .dropdown').eq(1).remove();
			$('#nav-charts .link_register').remove();
			$('#nav-charts .link_login').remove();
			
			$('#periods li:first-child').remove();
			$('#periods li:last-child').remove();
			$('#periods li:last-child').remove();
			
			$('#footer_outer').remove();
			$('#trades').remove();
			$('#market').remove();
			$('#orderbook .orderbook').remove();
			$('#sidebar').css({width:0, height:35, borderLeft:'0px'});
			$('#sidebar_outer').css({position:'absolute', bottom:70, left:0, height:35});
			$('#before_trades').css({borderBottom:'0px'});
			
			$('table.simple').css({fontSize:11});
			$('table.simple td').css({padding:2});
			$('table.simple tr:last-child').remove();
			return;
		}
		
		/*****************************
		******************************
		DEKLARACJE ZMIENNYCH + USTAWIENIA POCZĄTKOWE
		******************************
		*****************************/
		var notification;
		var dataName_arr 	= [['calc_buy_price', 'calc_buy_btc', 'calc_buy_value'], ['calc_sell_price', 'calc_sell_btc', 'calc_sell_value'], ['calc_profit']];
		var cookieArray 	= [];
		for (var prop in $.cookie()) if (prop.indexOf('ubus') > -1) cookieArray.push(prop);
		
		var miniEnable 				= false;
		var eliminateFirstUpdateBug = false;
		var upAlert 				= true
		var upAlertActive 			= false;
		var downAlertActive 		= false;
		var autoUpdatePriceTrigger 	= false;
		var shiftDown 				= false;
		
		
		var usdBool 	= window.location.pathname.substring(window.location.pathname.lastIndexOf('/')+1).indexOf('usd') > 1 ? true : false;
		var usdValue 	= myCookie("settings-usd-value") == undefined ? 3.1 : myCookie('settings-usd-value');
		var max 		= myCookie("settings-max-value") == undefined ? 4 : myCookie('settings-max-value');
		var global 		= myCookie("settings-global-value") == 'true' ? true : false;
		
		initCalc();
		getCalcCookieAndSetActionToRow();
		
		initClock();
		initMini();
		initAlertAndAction();
		calcBuyChange();
		initAutoUpdate();
		initSettingsPopup();
		
		/*****************************
		******************************
		MINI WYKRES
		******************************
		*****************************/	
		function initMini()
		{
			$('<li>').addClass("subsep").appendTo($('#periods'));
			$('<li>').attr({id:'miniChartBtn'}).css({cursor:'pointer'}).html('Mini Chart').appendTo($('#periods')).click(function (){
				if ($(this).hasClass('on')){
					$(this).removeClass('on');
					$('#miniChart').remove();
				}else {
					$(this).addClass('on');
					$('<div>').attr({id:'miniChart'}).css({position:'absolute', bottom:0, border:'1px solid #444', opacity:0.9}).html('<iframe src="http://bitcoinwisdom.com/markets/btce/btcusd?mikrochart" frameborder="0" width="550px" height="320px"></iframe>').appendTo('body');
				}
			});
		}
			
		/*****************************
		******************************
		AKTUALIZACJA CENY SPRZEDAZY ORAZ ALERTY
		******************************
		*****************************/	
		function initAutoUpdate()
		{
			for (var i = 1 ; i <= max; i++){
				var input = $('#'+String(dataName_arr[1][0]+i));
				input.val($('#price').html());
			}
			
			autoChangeValue();
			$('#price').bind('DOMNodeInserted', function () { autoChangeValue()});
		}	
		
		function autoChangeValue()
		{
			autoStatus();
			var currentPrice = $('#price').html();
			if ((currentPrice >= strToNum($('#up_alert_input').val())) && (currentPrice != 0) && upAlertActive){
				upActivateAlert(true);
			}
			if ((currentPrice <= strToNum($('#down_alert_input').val())) && (currentPrice != 0) && downAlertActive){
				downActivateAlert(true);
			}
		}
		
		function autoStatus() 
		{
			for (var i = 1 ; i <= max; i++){
				var input = $('#'+String(dataName_arr[1][0]+i));
				if (input.parent().find('div').hasClass('select')) input.val($('#price').html());
			}
			calcBuyChange();
		}
		
		function initAlertAndAction() 
		{
			upAlertActive = myCookie("addon-up-alert") == '1' ? true : false;
			downAlertActive = myCookie("addon-down-alert") == '1' ? true : false;
			$('#up_alert_input').val(myCookie("addon-up-alert-value") == undefined ? 0 : strToNum(myCookie("addon-up-alert-value")));
			$('#down_alert_input').val(myCookie("addon-down-alert-value") == undefined ? 0 : strToNum(myCookie("addon-down-alert-value")));
		
			setAlertState($('#up_alert_submit'), upAlertActive);
			setAlertState($('#down_alert_submit'), downAlertActive);
		
			$('#up_alert_submit').click(function (){
				checkPermission();
				upAlertActive = !upAlertActive;
				myCookie("addon-up-alert", upAlertActive ? 1 : 0);
				setAlertState($(this), upAlertActive);
			});
			
			$('#down_alert_submit').click(function () {
				checkPermission();
				downAlertActive = !downAlertActive;
				myCookie("addon-down-alert", downAlertActive ? 1 : 0);
				setAlertState($(this), downAlertActive);
			});
			
			$('#up_alert_input').on("input", function (){ myCookie('addon-up-alert-value', $(this).val()); });
			$('#down_alert_input').on("input", function (){	myCookie('addon-down-alert-value', $(this).val()); });
		}
		
		function setAlertState(cont, value)
		{
			cont.html(value ? 'aktywny' : 'ustaw');
			if (value) cont.addClass('active');
			else cont.removeClass('active');
		}
		
		function upActivateAlert(not) 
		{	
			upAlert = true; 
			if (not == true) {
				notify(); 
				$('#up_alert .player').html('<audio autoplay><source src="http://fstore.goblix.pl/bitcoin/i/up.ogg" type="audio/ogg"><source src="http://fstore.goblix.pl/bitcoin/i/up.aac" type="audio/aac"><source src="http://fstore.goblix.pl/bitcoin/i/up.m4a" type="audio/m4a"><source src="http://fstore.goblix.pl/bitcoin/i/up.mp3" type="audio/mpeg"></audio>'); 
			}
		}
		
		function downActivateAlert(not) { 
			upAlert = false; 
			if (not == true) {
				notify(); 
				$('#down_alert .player').html('<audio autoplay><source src="http://fstore.goblix.pl/bitcoin/i/down.ogg" type="audio/ogg"><source src="http://fstore.goblix.pl/bitcoin/i/down.aac" type="audio/aac"><source src="http://fstore.goblix.pl/bitcoin/i/down.m4a" type="audio/m4a"><source src="http://fstore.goblix.pl/bitcoin/i/down.mp3" type="audio/mpeg"></audio>'); 
			}
		}
		
		/*****************************
		******************************
		KALKULATOR
		******************************
		*****************************/	
		function initCalc()
		{
			var divek = $('<div>').css({overflow:'hidden', position:'absolute', top:110, zIndex:100, opacity:.95}).prependTo('body');
			divek.html(createHtml());
			
			$('<li>').addClass("subsep").prependTo($('#periods'));
			
			$('<li>').html('<div id="CalcBtn">KALKULATOR ZYSKU</div>').prependTo($('#periods'));
			
			$('#CalcBtn').css({cursor:'pointer', color:'#FC9'}).click(function(){
				myCookie('addon-calc-show', $('#calc').css('display'));
				$('#calc').slideToggle(100)
			});
			
			if (myCookie('addon-calc-show') == 'none') { $('#calc').show() } else { $('#calc').hide() };
			
			$('#price').css({cursor:'pointer'}).click(function(){
				for (var i = 1 ; i <= max; i++){
					$('#'+String(dataName_arr[1][0]+i)).val($('#price').html());
				}
				calcBuyChange();
			});
		}
		
		function getCalcCookieAndSetActionToRow()
		{
			for (var i = 1 ; i <= max; i++){
			
				if (myCookie(String($('#'+String(dataName_arr[1][0]+i)).attr('id')+'_auto')) == 'true') $('#'+String(dataName_arr[1][0]+i)).parent().find('div').addClass('select');
			
				$('#'+String(dataName_arr[0][0]+i)).val(myCookie(String(dataName_arr[0][0]+i)) == undefined ? '0' :  myCookie(String(dataName_arr[0][0]+i)));
				$('#'+String(dataName_arr[0][1]+i)).val(myCookie(String(dataName_arr[0][1]+i)) == undefined ? '0' :  myCookie(String(dataName_arr[0][1]+i)));
				
				$('#'+String(dataName_arr[1][0]+i)).val(strToNum($('#'+String(dataName_arr[0][0]+i)).val()));

				$('#'+String(dataName_arr[0][0]+i)+', #'+String(dataName_arr[0][1]+i)).on("input", function (){ calcBuyChange(); });
				$('#'+String(dataName_arr[1][0]+i)+', #'+String(dataName_arr[1][1]+i)).on("input", function (){ calcBuyChange(); });
			
				$( '#'+String(dataName_arr[0][0]+i)+', #'+String(dataName_arr[0][1]+i)+', #'+String(dataName_arr[1][0]+i)+', #'+String(dataName_arr[1][1]+i)+'').keydown(function(event) {
					if (event.keyCode == 16){
						shiftDown = true;
					}
					if ((event.keyCode == 38) || (event.keyCode == 40)){
						event.preventDefault();
						if (event.keyCode == 38) $( this ).val(fixTo(strToNum($( this ).val())+(shiftDown ? .1 : 0.01), 8));
						if (event.keyCode == 40) $( this ).val(fixTo(strToNum($( this ).val())-(shiftDown ? .1 : 0.01), 8));
						
						calcBuyChange();
					}
				}).keyup(function(event) {
					for (var i=0; i<=max; i++){
						myCookie(String(dataName_arr[0][0]+i), $('#'+String(dataName_arr[0][0]+i)).val());
						myCookie(String(dataName_arr[0][1]+i), $('#'+String(dataName_arr[0][1]+i)).val());
					}
					
					if (event.keyCode == 16){
						shiftDown = false;
					}
				})
				
			}
			
			$('#calc .autoUpdate div').click(function() {	
				var bool = false;
				if ($(this).hasClass('select')){
					$(this).removeClass('select');	
				}else {
					$(this).addClass('select');	
					bool = true;
				}
				
				myCookie(String($(this).parent().find('input').attr('id')+'_auto'), bool);
				
				$(this).parent().find('input').val($('#price').html());
				calcBuyChange();
			});
		}
		
		function calcBuyChange()
		{
			var sum_profit = sum_all = sum_prc = sum_prc_all = sum_prc = sum_prc_all = postfixSum = postfix2Sum = 0;
			
			for (var i = 1 ; i <= max; i++){
				var buy_value = strToNum($('#'+String(dataName_arr[0][0]+i)).val())*strToNum($('#'+String(dataName_arr[0][1]+i)).val());
				$('#'+String(dataName_arr[0][2]+i)).html(fixTo(buy_value, 8));
				
				$('#'+String(dataName_arr[1][1]+i)).val(fixTo(strToNum($('#'+String(dataName_arr[0][1]+i)).val())*0.998, 8));
				var sell_value = fixTo(strToNum($('#'+String(dataName_arr[1][0]+i)).val())*strToNum($('#'+String(dataName_arr[1][1]+i)).val())*0.998, 8);

				if (sell_value-buy_value <= 0) 	$('#'+String(dataName_arr[2][0]+i)).addClass('loss');
				else 							$('#'+String(dataName_arr[2][0]+i)).removeClass('loss');
				
				var	pl_prof = (sell_value-buy_value);
				var	pl_all = sell_value;
				
				sum_all += fixTo(sell_value, 8);
				sum_profit += fixTo(sell_value-buy_value, 8);
				
				postfix = 		usdBool ? ' ~' + fixTo( pl_prof*usdValue	, 2) + 'PLN' : '';
				postfix2 = 		usdBool ? ' ~' + fixTo( pl_all*usdValue		, 2) + 'PLN' : '';
				postfixSum = 	usdBool ? ' ~' + fixTo( sum_profit*usdValue	, 2) + 'PLN' : '';
				postfix2Sum =	usdBool ? ' ~ '+ fixTo( sum_all*usdValue	, 2) + 'PLN' : '';

				var prc = fixTo(strToNum((sell_value-buy_value)/buy_value)*100, 2);
				var prc_all = fixTo(strToNum((sell_value*100)/buy_value), 2);
				
				sum_prc += prc;
				sum_prc_all += prc_all;

				$('#'+String(dataName_arr[2][0]+i)).attr({ title:strToNum(prc) + '%' + postfix }).html(fixTo(sell_value-buy_value, 8));
				$('#'+String(dataName_arr[1][2]+i)).attr({ title:strToNum(prc_all) + '%' + postfix2 }).html(fixTo(sell_value, 8));
			}
			
			if (sum_all <= 0) 		$('#sum_all').addClass('loss'); 	else $('#sum_all').removeClass('loss');
			if (sum_profit <= 0)	$('#sum_profit').addClass('loss'); 	else $('#sum_profit').removeClass('loss');
			
			$('#sum_all').attr({ title:fixTo(strToNum(sum_prc_all), 2) + '%' + postfix2Sum }).html(fixTo(sum_all, 8));
			$('#sum_profit').attr({ title:strToNum(sum_prc) + '%' + postfixSum }).html(fixTo(sum_profit, 8));
		}
		
		/*****************************
		******************************
		GENEROWANIE OKNA USTAWIEŃ ORAZ ZMIANA USTAWIEŃ
		******************************
		*****************************/	
		function initSettingsPopup()
		{
			var layer = $('<div>').addClass('layer');
			var popup = $('<div>').addClass('popup');
			var p_cnt = $('<div>').addClass('cnt').html(getSettingsHtml());
			var close = $('<div>').addClass('close').text('x');
			
			$(document).resize(function(){ setSize(); });
			
			layer.css({	height: getSize().h, width: getSize().w	})

			$('#settingsCalc .trigger').click(function(){
				layer.prependTo('body');
				layer.after(popup);
				p_cnt.appendTo(popup);
				close.appendTo(p_cnt);
				
				popup.css({	marginTop: - popup.height()/2 });
				
				layer.click(function(){	restoreSettings(); layer.remove();	popup.remove(); });
				close.click(function(){	restoreSettings(); layer.remove();	popup.remove(); });
				
				$('#setCookie .options span').click(function (){
					$('#setCookie .options span').removeClass('on');
					$(this).addClass('on');
				});
				
				$('#saveSettings').click(function (){
					usdValue = strToNum($('#exCur').val());
					max = parseInt(strToNum($('#rowsNum').val()));
					
					global = $('#setCookie .options span').eq(0).hasClass('on') ? true : false;
					
					$('#rowsNum').val(max);
					
					$('.calc-row').remove();
					var newRow = $('<div>').insertAfter($('#calc .sec'));
					newRow.html(getCalcRow());
					
					getCalcCookieAndSetActionToRow();
					calcBuyChange();
					
					myCookie('settings-global-value', global);
					myCookie('settings-max-value', max);
					myCookie('settings-usd-value', usdValue);
					
					swichCookie();
					
					layer.remove();	
					popup.remove();
				})
			});
		}
			
		function restoreSettings()
		{
			$('#exCur').val(usdValue);
			$('#rowsNum').val(max);
			$('#setCookie .options span').removeClass('on');
			$('#setCookie .options span').eq(global ? 0 : 1).addClass('on')
		}
			
		/*****************************
		******************************
		POPUP CHROME (NOTIFICATION)
		******************************
		*****************************/	
		function checkPermission()
		{
			try {
				var havePermission = window.webkitNotifications.checkPermission();
				if (havePermission == 0) {
					return true;
				} else { 
					window.webkitNotifications.requestPermission(); 
					return false;
				}
			}catch(err){
				return false;
			}
		}
		
		function notify() 
		{
			if (checkPermission()){
				if (notification) notification.close();
				
				notification = window.webkitNotifications.createNotification(
					upAlert ? 'http://fstore.goblix.pl/bitcoin/i/logo_bitcoin_up.png' : 'http://fstore.goblix.pl/bitcoin/i/logo_bitcoin_down.png',
					'BitCoin ALERT!',
					upAlert ? 'Cena wzrosła do żądanego poziomu!' : 'Cena spadła do żądanego poziomu!'
					);
				
				notification.onclick = function () {
					try { window.focus(); }catch(err){}
					
					if (upAlert) {
						upAlertActive = false;
						myCookie("addon-up-alert", 0);
						setAlertState($('#up_alert_submit'), false);
					}else {
						downAlertActive = false;
						myCookie("addon-down-alert", 0);
						setAlertState($('#down_alert_submit'), false);
					}
					notification.close();
				};
				notification.show();
			}
		} 
		
		/*****************************
		******************************
		OBSŁUGA ZEGARA PL, USA, CHINA
		******************************
		*****************************/
		function initClock()
		{
			var clock = $('<div>').addClass("clock difficulty").css({position:'absolute', right:155, top:5, width:220, fontFamily:'sans', fontSize:11, textAlign:'right'}).appendTo($('#header'));
			clock.html(getClockHtml());
			updateTime();
		}
		
		function updateTime(){
			var workDate = new Date()
			var UTCDate = new Date()
			UTCDate.setTime(workDate.getTime()+workDate.getTimezoneOffset()*60000)
		
			$('#slot_pl').html(offsetTime(1, UTCDate));
			$('#slot_usa').html(offsetTime(-6, UTCDate));
			$('#slot_china').html(offsetTime(8, UTCDate));
			setTimeout(updateTime, 1000);
		}
		
		function offsetTime(offset, UTCDate)
		{
			var tempDate = new Date();
			tempDate.setTime(UTCDate.getTime()+3600000*(offset));
			timeValue = ((tempDate.getHours()<10) ? ("0"+tempDate.getHours()) : (""+tempDate.getHours()));
			timeValue += ':'+((tempDate.getMinutes()<10) ? ("0"+tempDate.getMinutes()) : tempDate.getMinutes());
			timeValue += ':'+((tempDate.getSeconds()<10) ? ("0"+tempDate.getSeconds()) : tempDate.getSeconds());
			return timeValue;
		}
		
		
		/*****************************
		******************************
		ZAPISYWANIE DO COOKIE I EDYCJA COOKIE
		******************************
		*****************************/
		function removeAllCookie()
		{
			for (var i=0 ; i<cookieArray.length; i++){
				$.removeCookie(cookieArray[i], {domain:'bitcoinwisdom.com', path:window.location.pathname});
				$.removeCookie(cookieArray[i], {domain:'bitcoinwisdom.com', path:'/'});
				$.removeCookie(cookieArray[i], { path:'/'});
			}
		}
		
		function swichCookie()
		{
			for (var prop in $.cookie()){
				if (prop.indexOf('ubus') > -1) cookieArray.push(prop);
			}
		
			var tCookieArray = [];
			for (var i=0 ; i<cookieArray.length; i++){
				tCookieArray.push({name:cookieArray[i], value:$.cookie(cookieArray[i])});
			}
			
			removeAllCookie();
			
			for (var i=0 ; i<tCookieArray.length; i++){
				myCookie(tCookieArray[i].name, tCookieArray[i].value);
			}
		}
		
		function myCookie()
		{
			var name = String(arguments[0]);
			var value = String(arguments[1]);
			var cookieName = name.indexOf('ubus') > -1 ? name : 'ubus_'+name;
			
			if (arguments.length == 1){
				var value = $.cookie(cookieName);
				return value;
			}else {
				var t = true;
				console.log(cookieName)
				for (var i = 0; i<cookieArray.lenght; i++){
					if (cookieArray[i] == cookieName) { t = false; break;	}
				}
				if (t) cookieArray.push(cookieName);
				$.cookie(cookieName, value, {	domain:'bitcoinwisdom.com', expires:365, path:global ? '/' : window.location.pathname});
			}
			return true;
		}
		
		/*****************************
		******************************
		POBIERANIE ROZMIARU STRONY ORAZ DZIAŁANIA NA LICZBACH
		******************************
		*****************************/
		function getSize() { return {w:$(window).width(), h:$(window).height()}; }
		function setSize() { layer.css({ height: getSize().h, width: getSize().w })	}
		
		function strToNum(str)
		{
			var val = parseFloat(String(str).replace(',', '.'));
			return String(val) == 'NaN' ? 0 : val;
		}

		function fixTo(value, sq)
		{
			var pow = Math.pow(10, sq);
			return Math.round(value*pow)/pow;
		}
		
		
		/*****************************
		******************************
		HTML I CSS
		******************************
		*****************************/
		function getCalcRow()
		{
			var str = '';
			for (var i = 1 ; i <= max; i++){
				str += '<ul class="calc-row">'
					str += '<li class="input"><input type="text" name="cena kupna" value="10" id="'+dataName_arr[0][0]+i+'"></li>'
					str += '<li class="input"><input type="text" name="ilość zakupionych BTC" value="1" id="'+dataName_arr[0][1]+i+'"></li>'
					str += '<li class="normal"><div id="'+dataName_arr[0][2]+i+'">0</div></li>'
					str += '<li class="input autoUpdate"><input type="text" name="cena sprzedaży" value="720" id="'+dataName_arr[1][0]+i+'"><div>A</></li>'
					str += '<li class="input"><input type="text" name="ilość sprzedawanych BTC" value="1" id="'+dataName_arr[1][1]+i+'"></li>'
					str += '<li class="normal"><div id="'+dataName_arr[1][2]+i+'">0</div></li>'
					str += '<li class="normal"><div id="'+dataName_arr[2][0]+i+'">0</div></li>'
				str += '</ul>'
			}
			return str;
		}
		
		function getSettingsHtml()
		{
			var str='';
				str += '<h2>Ustawienia</h2>'
				str += '<div id="setCookie" class="section">'
					str += '<div class="hd">Cookie</div>'
					str += '<div class="options">'
						str += '<span class="set'+(global == true ? ' on' : '')+'">Jedno</span>'
						str += '<span class="set'+(global == false ? ' on' : '')+'">Wiele</span>'
					str += '</div>'
				str += '</div>'
				str += '<div id="setTableRow" class="section">'
					str += '<div class="hd">Ilość wierszy</div>'
					str += '<div class="options">';
						str += '<input type="text" name="ilość wierszy" value="'+max+'" id="rowsNum">'
					str += '</div>'
				str += '</div>'
				str += '<div id="setExchange" class="section">'
					str += '<div class="hd">Kurs USD</div>'
					str += '<div class="options">'
						str += '<input type="text" name="kurs usd" value="'+usdValue+'" id="exCur">'
					str += '</div>'
				str += '</div>'
				str += '<div style="font-size:11px; margin-bottom:3px">DO ZROBIENIA:</div>'
				str += '<div id="setAlert" class="section">'
					str += '<div class="hd">Alert</div>'
					str += '<div class="options">'
						str += '<span class="set">Dzwięk</span>'
						str += '<span class="set">Popup</span>'
						str += '<span class="set on">Dzwięk i Popup</span>'
					str += '</div>'
				str += '</div>'
				str += '<div id="tryAlert" class="section">'
					str += '<div class="hd">Alert (test)</div>'
					str += '<div class="options">'
						str += '<span class="set">Dzwięk</span>'
						str += '<span class="set">Popup</span>'
						str += '<span class="set">Dzwięk i Popup</span>'
					str += '</div>'
				str += '</div>'
				str += '<div id="saveSettings">Zapisz</div>';

			return str;
		}
		
		function getClockHtml()
		{
			var str = '';
			str += '<div class="inner">'
				str += '<table cellspacing="0" cellpadding="0" border="0">'
					str += '<tbody><tr>'
						str += '<td><b>POLSKA</b></td>'
						str += '<td><span id="slot_pl">--:--:--</span></td>'
					str += '</tr>'
					str += '<tr>'
						str += '<td><b>USA</b></td>'
						str += '<td><span id="slot_usa">--:--:--</span></td>'
					str += '</tr>'
					str += '<tr>'
						str += '<td><b>CHINY</b></td>'
						str += '<td><span id="slot_china">--:--:--</span></td>'
					str += '</tr>'
				str += '</tbody></table>'
			str += '</div>'
			return str;
		}
	
		function createHtml()
		{
			var str='';
			str += '<div id="calc" class="row">'
			str += '<ul class="main">'
				str += '<li>Kupno</li>'
				str += '<li>Sprzedaż</li>'
				str += '<li>Zysk</li>'
			str += '</ul>'
			str += '<ul class="sec">'
				str += '<li>Kurs [..]</li>'
				str += '<li>Ilość</li>'
				str += '<li>Wartość [..]</li>'
				str += '<li>Kurs [..]</li>'
				str += '<li>Ilość</li>'
				str += '<li>Wartość [..]</li>'
				str += '<li>profit [..]</li>'
			str += '</ul>'
			
			str += '<div>';
			str += getCalcRow();
			str += '</div>'
			
			str += '<div id="btmTable">'
				str += '<div class="left">'

					str += '<div id="alert" class="row">'
						str += '<div class="hd">Alerty</div>'
						str += '<div id="up_alert" class="clr">'
							str += '<h3>Max (PLN):</h3>'
							str += '<input type="text" name="alert cenowy" value="0" id="up_alert_input">'
							str += '<div id="up_alert_submit">ustaw</div>'
							str += '<div class="player"></div>'
						str += '</div>'
						str += '<div id="down_alert" class="clr">'
							str += '<h3>Min (PLN):</h3>'
							str += '<input type="text" name="alert cenowy" value="0" id="down_alert_input">'
							str += '<div id="down_alert_submit">ustaw</div>'
							str += '<div class="player"></div>'
						str += '</div>'
					str += '</div>'
					
				str += '</div>'
				str += '<div class="right">'
					str += '<ul class="tabs">'
						str += '<li>Zysk [suma]</li>'
						str += '<li>Wartość [suma]</li>'
					str += '</ul>'
					str += '<ul class="sum">'
						str += '<li id="sum_profit"></li>'
						str += '<li id="sum_all"></li>'
					str += '</ul>'
				str += '</div>'
			str += '</div>'
			
			str += '<div id="settingsCalc">'
				str += '<span class="trigger">ustawienia</span>'
			str += '</div>'
			
			str += '</div>'
			
			str += '<style>'
			
			str += 'body {'
				str += 'position: relative;'
			str += '}'

			str += 'ol, ul { list-style: none }'
			str += 'h2 { font-size:14px; color:#6BF; padding-left:5px;}'
			str += '#calc{'
			str += 		'overflow:hidden;'
			str += '}'
			
			str += '#calc ul{'
				str += 'overflow: hidden;'
				str += 'margin: 0;'
				str += 'padding-left:10px;'
			str += '}'
			
			str += '.clock b{'
				str += 'color:#6BF;'
			str += '}'

			str += '#calc li{'
				str += 'background:#000;'
				str += 'font-size:11px;'
				str += 'width:80px;'
				str += 'float:left;'
				str += 'border-bottom:1px solid #3A3A3A;'
				str += 'border-right:1px solid #3A3A3A;'
				str += 'padding:2px 0 2px 3px;'
			str += '}'

			str += '#btmTable {'
				str += 'overflow: hidden;'
			str += '}'
			
			str += '#btmTable .left {'
				str += 'background: #000;'
				str += 'float: left;'
				str += 'padding: 0;'
				str += 'width: 419px;'
				str += 'border-bottom: 1px solid #3A3A3A;'
				str += 'border-left: 1px solid #3A3A3A;'
				str += 'margin-left: 10px;'
			str += '}'
			
			str += '#btmTable #up_alert_input, #btmTable #down_alert_input {'
				str += 'display: inline-block;'
				str += 'font: normal 11px arial;'
			str += '}'	
				
			str += '#btmTable #up_alert_submit, #btmTable #down_alert_submit, '
			str += '.popup #saveSettings,'
			str += '#settingsCalc .trigger {'
				str += '-moz-box-shadow:inset 0px 1px 0px 0px #ffffff;'
				str += '-webkit-box-shadow:inset 0px 1px 0px 0px #ffffff;'
				str += 'box-shadow:inset 0px 1px 0px 0px #ffffff;'
				str += 'background:-webkit-gradient( linear, left top, left bottom, color-stop(0.05, #ededed), color-stop(1, #dfdfdf) );'
				str += 'background-color:#ededed;'
				str += 'cursor: pointer;'
				str += 'border:1px solid #dcdcdc;'
				str += 'display:inline-block;'
				str += 'color:#777777;'
				str += 'font: bold 11px Arial;'
				str += 'height:20px;'
				str += 'line-height:20px;'
				str += 'width:61px;'
				str += 'text-align:center;'
				str += 'text-shadow:1px 1px 0px #ffffff;'
			str += '}'	

			str += '#btmTable #up_alert_submit:hover, #btmTable #down_alert_submit:hover,'
			str += '#btmTable #up_alert_submit.active, #btmTable #down_alert_submit.active,'
			str += '.popup #saveSettings:hover,'
			str += '#settingsCalc .trigger:hover {'
				str += 'background:-webkit-gradient( linear, left top, left bottom, color-stop(0.05, #dfdfdf), color-stop(1, #ededed) );'
				str += 'background-color:#dfdfdf;'
			str += '}'

			str += '#btmTable #up_alert_submit.active, #btmTable #down_alert_submit.active {'
				str += 'color:#111;'
			str += '}'
			
			str += '#btmTable #up_alert {'
				str += 'float: right;'
				str += 'width: 209px;'
				str += 'border-left: 1px solid #3A3A3A'
			str += '}'

			str += '#btmTable #down_alert {'
				str += 'float: left;'
				str += 'width: 209px;'
			str += '}'
				
			str += '#btmTable h3 {'
				str += 'display: inline-block;'
				str += 'font: normal 11px arial;'
				str += 'margin: 0 5px;'
				str += 'width: 53px;'
			str += '}'

			str += '#btmTable #up_alert {'
				str += 'margin: 0;'
			str += '}'
			
			str += '#btmTable .right {'
				str += 'float: right;'
				str += 'width: 169px;'
			str += '}'
			
			str += '#btmTable .hd {'
				str += 'background: #002847;'
				str += 'color: #dedede;'
				str += 'font: normal 12px arial;'
				str += 'margin: 0;'
				str += 'height: 17px;'
				str += 'padding: 3px 0 2px 3px;'
				str += 'border-bottom: 1px solid #3A3A3A;;'
				str += 'text-align: center;'
			str += '}'
			
			/* start sum */
			str += '#calc .sum, #calc .tabs {'
				str += 'overflow: hidden;'
				str += 'padding: 0;'
			str += '}'

			str += '#calc .sum li {'
				str += 'font-size: 11px;'
				str += 'padding: 2px 0 2px 3px;'
			str += '}'
			
			str += '#calc .sum li, #calc .tabs li {'
				str += 'float: right;'
			str += '}'
			
			str += '#calc .tabs li {'
				str += 'text-align: center;'
			str += '}'
					
			str += '#calc .sum li:nth-child(1){'
				str += 'color: #00cc00;'
			str += '}'		
					
			str += '#calc .sum li:nth-child(2), #calc .tabs li:nth-child(2){'
				str += 'border-left:1px solid #3A3A3A;'
				str += 'border-right: 0;'
			str += '}'
			
			str += '#calc .tabs li:nth-child(2){'
				str += 'background: #161D27;'
			str += '}'
			
			str += '#calc .tabs li:nth-child(1){'
				str += 'background: #032F41;'
			str += '}'
		
			str += '#calc .sum li.loss {'
				str += 'color:#cc0000;'
			str += '}'
		
			/* end sum */
			
			str += '#calc .main{'
				str += 'margin:0;'
			str += '}'
			
			str += '#calc .main li{'
				str += 'color:#dedede;'
				str += 'background:#000;'
				str += 'font-size:11px;'
				str += 'width:248px;'
				str += 'text-align:center;'
				str += 'float:left;'
				str += 'border-bottom:1px solid #3A3A3A;'
				str += 'border-right:1px solid #3A3A3A;'
				str += 'border-top: 1px solid #3A3A3A;'
				str += 'padding:2px 0 2px 3px;'
			str += '}'
			
			str += '#calc li:first-child{'
				str += 'border-left:1px solid #3A3A3A;'
			str += '}'

			str += '#calc .main li:last-child{'
				str += 'width:80px;'
			str += '}'

			str += '#calc .main li:nth-child(1){'
				str += 'background:#00332D;'
			str += '}'

			str += '#calc .main li:nth-child(2){'
				str += 'background:#161D27;'
			str += '}'

			str += '#calc .main li:nth-child(3){'
				str += 'background:#032F41;'
			str += '}'

			str += '#calc .sec li {'
				str += 'text-align:center;'
			str += '}'

			str += '#calc .sec li:nth-child(-n+3){'
				str += 'color:#dedede;'
				str += 'background:#00332D;'
			str += '}'

			str += '#calc .sec li:nth-child(n+4){'
				str += 'color:#dedede;'
				str += 'background:#161D27;'
			str += '}'
			str += '#calc .sec li:last-child{'
				str += 'color:#dedede;'
				str += 'background:#032F41;'
			str += '}'

			str += '#calc li.input{'
				str += 'width:83px;'
				str += 'padding:0;'
			str += '}'

			str += '#calc li.normal{'
				str += 'padding:2px 0 2px 3px;'
				str += 'background:#000000;'
				str += 'color:#dedede;'
				str += 'font-size:11px;'
			str += '}'

			str += '#calc input{'
				str += 'width:80px;'
				str += 'margin:0;'
				str += 'padding: 4px 0 4px 3px;'
				str += 'border:0px;'
				str += 'background:#222;'
				str += 'font-size: 11px;'
			str += '}'
			
			str += '#calc .autoUpdate input{'
				str += 'width:65px;'
				str += 'float:left;'
			str += '}'
			
			str += '#calc .autoUpdate div{'
				str += 'width: 13px;'
				str += 'float: left;'
				str += 'padding: 4px 0;'
				str += 'text-align: center;'

				str += '-moz-box-shadow:inset 0px 1px 0px 0px #575757;'
				str += '-webkit-box-shadow:inset 0px 1px 0px 0px #575757;'
				str += 'box-shadow:inset 0px 1px 0px 0px #575757;'
				str += 'background:-webkit-gradient( linear, left top, left bottom, color-stop(0.05, #555555), color-stop(1, #505050) );'
				str += 'background-color:#555555;'
				str += 'cursor: pointer;'
				str += 'border:1px solid #666666;'
				str += 'display:inline-block;'
				str += 'color:#BBB;'
				str += 'font: bold 10px Arial;'
				str += 'text-shadow:1px 1px 0px #000000;'
			str += '}'
			
			str += '#calc .autoUpdate .select{'
				str += 'color:#009900;'
				str += '-moz-box-shadow:inset 0px 1px 0px 0px #ffffff;'
				str += '-webkit-box-shadow:inset 0px 1px 0px 0px #ffffff;'
				str += 'box-shadow:inset 0px 1px 0px 0px #ffffff;'
				str += 'background:-webkit-gradient( linear, left top, left bottom, color-stop(0.05, #ededed), color-stop(1, #dfdfdf) );'
				str += 'background-color:#ededed;'
				str += 'cursor: pointer;'
				str += 'border:1px solid #dcdcdc;'
				str += 'text-shadow:1px 1px 0px #ffffff;'
			str += '}'
			
			str += '#calc .autoUpdate div:hover{'
				str += 'color:#009900;'
			str += '}'
			
			str += '#calc ul li:last-child div{'
				str += 'color:#00cc00;'
			str += '}'

			str += '#calc ul li:last-child div.loss{'
				str += 'color:#cc0000;'
			str += '}'
			
			str += '.layer {'
				str += 'background: #000;'
				str += 'opacity: 0.7;'
				str += 'position: absolute;'
				str += 'top: 0; left: 0;'
				str += 'z-index: 101;'
			str += '}'

			str += '.popup {'
				str += 'background: #000;'
				str += 'border: 1px solid #3A3A3A;'
				str += 'position: absolute;'
				str += 'top: 50%; left: 50%;'
				str += 'margin-left: -100px;'
				str += 'z-index: 102;'
			str += '}'
			
			str += '.popup .cnt {'
				str += 'position: relative;'
				str += 'padding: 10px;'
			str += '}'
			
			str += '.popup h2 {'
				str += 'margin: 0 0 10px; padding: 0;'
			str += '}'
			
			str += '.popup .close {'
				str += 'background: #000;'
				str += 'border: 1px solid #3A3A3A;'
				str += 'position: absolute;'
				str += 'top: -1px; right: -1px;'
				str += 'width: 22px; height: 19px;'
				str += 'padding: 2px 0 0px;'
				str += 'text-align: center;'
				str += 'cursor: pointer;'
				str += 'color: #a2a2a2;'
				str += 'font: bold 14px Arial;'
			str += '}'
			
			str += '.popup .close:hover {'
				str += 'background: #151515;'
				str += 'color: #fff;'
			str += '}'
			
			str += '.popup .section {'
				str += 'margin-bottom: 5px;'
				str += 'padding-bottom: 5px;'
				str += 'border-bottom: 1px solid #555;'
				str += 'overflow: hidden;'
			str += '}'
			
			str += '.popup .section {'
				str += 'overflow: hidden;'
			str += '}'
			
			str += '.popup .section .hd {'
				str += 'float: left;'
				str += 'text-transform: uppercase;'
				str += 'width: 85px;'
				str += 'font: bold 11px arial;'
				str += 'margin-right: 10px;'
			str += '}'
			
			str += '.popup .section .options {'
				str += 'float: right;'
			str += '}'
			
			str += '.popup .section .options span {'
				str += 'float: left;'
				str += 'margin: 0 5px;'
				str += 'font: 11px Arial;'
				str += 'cursor: pointer;'
				str += 'color: #6BF;'
				str += 'text-transform: uppercase;'
			str += '}'
			
			str += '.popup .section .options span:hover {'
				str += 'text-decoration: underline;'
			str += '}'
			
			str += '#miniChartBtn.on{'
				str += 'color: #FC9;'
			str += '}'
			
			str += '.popup .section .options span.on {'
				str += 'color: #FC9;'
			str += '}'
			
			str += '.popup .section .options span.on:hover {'
					str += 'text-decoration: none;'
			str += '}'
			
			str += '.popup .section .options input[type="text"] {'
				str += 'font-size: 11px;'
			str += '}'
			
			str += '.popup #setTableRow .hd,'
			str += '.popup #setExchange .hd {'
				str += 'margin-top: 5px;'
			str += '}'
			
			str += '.popup #setTableRow .options input[type="text"],'
			str += '.popup #setExchange .options input[type="text"] {'
					str += 'text-align: center;'
					str += 'width: 45px;'
			str += '}'
			
			str += '.popup #saveSettings {'
					str += 'width: 40px;'
					str += 'float: right;'
					str += 'margin: 5px 0 10px;'
					str += 'padding: 0 10px;'
			str += '}'
			
			str += '#settingsCalc {'
				str += 'background: #000;'
				str += 'border: 1px solid #3A3A3A;'
				str += 'border-top: 0;'
				str += 'overflow: hidden;'
				str += 'float: right;'
				str += 'display: inline-block;'
			str += '}'
			
			str += '#settingsCalc .trigger {'
				str += 'float: right;'
				str += 'font-size: 11px;'
				str += 'cursor: pointer;'
				str += 'width: 60px;'
				str += 'padding: 0px 10px;'
			str += '}'
			
			str += '#calc .main li:nth-child(1),'
			str += '#calc .main li:nth-child(2),'
			str += '#calc .main li:nth-child(3),'
			str += '#calc .sec li:nth-child(n+4),'
			str += '#calc .sec li:nth-child(-n+3),'
			str += '#calc .sec li:nth-child(-n+4),'
			str += '#calc .sec li:last-child,'
			str += '#btmTable .hd,'
			str += '#calc .tabs li:nth-child(2),'
			str += '#calc .tabs li:nth-child(1) {'
				str += 'background: #000;'
			str += '}'
			
			str +='</style>';
			
			return str;
		}
	})
}

var script = document.createElement('script');
script.textContent = '(' + main.toString() + ')();';
document.body.appendChild(script);
