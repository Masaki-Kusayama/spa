/*
 * spa.shell.js
 * SPAのシェルモジュール
 */

/*jslint browser: true, continue: true,
  devel: true, indent: 2, maxerr: 50,
  newcap: true, nomen: true, plusplus: true,
  regexp: true, sloppy: true, vars: false,
  white: true
*/

/*global $, spa */
spa.shell = (function() {

  var configMap = {
    anchor_schema_map: {
      chat: { open: true, closed: true }
    },
    main_html: String()
      +'<div class="spa-shell-head">'
        +'<div class="spa-shell-head-logo"></div>'
        +'<div class="spa-shell-head-acct"></div>'
        +'<div class="spa-shell-head-search"></div>'
      + '</div>'
      + '<div class="spa-shell-main">'
        +'<div class="spa-shell-main-nav"></div>'
        +'<div class="spa-shell-main-content"></div>'
      +'</div>'
      +'<div class="spa-shell-foot"></div>'
      +'<div class="spa-shell-chat"></div>'
      +'<div class="spa-shell-modal"></div>'
    +'</div>',

    chat_extend_time: 1000,
    chat_retract_time: 300,
    chat_extend_height: 450,
    chat_retract_height: 15,
    chat_extended_title: 'Click to retract',
    chat_retracted_title: 'Click to extend'
  },
  stateMap = {
    $container: null,
    anchor_map: {},
    is_chat_retracted: true
  },
  jqueryMap = {},
  copyAnchorMap, setJqueryMap, toggleChat,
  changeAnchorPart, onHashchange,
  onClickChat, initModule;

  /* ユーティリティメソッド開始 */
  // 格納したアンカーマップのコピーを返す。オーバーヘッドを最小限にする。
  copyAnchorMap = function() {
    return $.extend(true, {}, stateMap.anchor_map);
  };

  /* DOMメソッド開始 */
  changeAnchorPart = function(arg_map) {
    var 
      anchor_map_revise = copyAnchorMap(),
      bool_return = true,
      key_name, key_name_dep;

      // アンカーマップへ変更を統合開始
      KEYVAL:
      for(key_name in arg_map) {
        if(arg_map.hasOwnProperty(key_name)) {
          // 反復中に従属キーを飛ばす
          if(key_name.indexOf('_') === 0) { continue KEYVAL; }

          // 独立キー値を更新する
          anchor_map_revise[key_name] = arg_map[key_name];

          // 合致する独立キーを更新する
          key_name_dep = '_' + key_name;
          if(arg_map[key_name_dep]) {
            anchor_map_revise[key_name_dep] = arg_map[key_name_dep];
          }
          else {
            delete anchor_map_revise[key_name_dep];
            delete anchor_map_revise['_s' + key_name_dep];
          }
        }
      }

      // URIの更新開始。成功しなければ元に戻す。
      try {
        $.uriAnchor.setAnchor(anchor_map_revise);
      }
      catch(error) {
        // URIを既知の状態に置き換える
        $.uriAnchor.setAnchor(stateMap.anchor_map, null, true);
        bool_return = false;
      }

      return bool_return;
  };

  setJqueryMap = function() {
    var $container = stateMap.$container;
    jqueryMap = {
      $container: $container,
      $chat: $container.find('.spa-shell-chat')
    };
  };

  toggleChat = function(do_extend, callback) {
    var 
      px_chat_ht = jqueryMap.$chat.height(),
      is_open = px_chat_ht === configMap.chat_extend_height,
      is_closed = px_chat_ht === configMap.chat_retract_height,
      is_sliding = ! is_open && ! is_closed;

    if(is_sliding) { return false; }

    // チャットスライダーの拡大開始
    if(do_extend) {
      jqueryMap.$chat.animate(
        { height: configMap.chat_extend_height },
        configMap.chat_extend_time,
        function() {
          jqueryMap.$chat.attr(
            'title', configMap.chat_extended_title
          );
          stateMap.is_chat_retracted = false;
          if(callback) { callback(jqueryMap.$chat); }
        }
      );

      return true;
    }

    // チャットスライダーの格納開始
    jqueryMap.$chat.animate(
      { height: configMap.chat_retract_height },
      configMap.chat_retract_time,
      function () {
        jqueryMap.$chat.attr(
          'title', configMap.chat_retracted_title
        );
        stateMap.is_chat_retracted = true;
        if(callback) { callback(jqueryMap.$chat); }
      }
    );

    return true;
  };
  /* DOMメソッド終了 */

  /* イベントハンドラ開始 */
  onHashchange = function(event) {
    var
      anchor_map_previous = copyAnchorMap(),
      anchor_map_proposed,
      _s_chat_previous, _s_chat_proposed,
      s_chat_proposed;

    // アンカーの解析を試みる
    try { anchor_map_proposed = $.uriAnchor.makeAnchorMap(); }
    catch (error) {
      $.uriAnchor.setAnchor(anchor_map_previous, null, true);
      return false;
    }
    stateMap.anchor_map = anchor_map_proposed;

    // 便利な変数
    _s_chat_previous = anchor_map_previous._s_chat;
    _s_chat_proposed = anchor_map_proposed._s_chat;

    // 変更されている場合のチャットコンポーネントの調整開始
    if(!anchor_map_previous || _s_chat_previous !== _s_chat_proposed) {
      s_chat_proposed = anchor_map_proposed.chat;
      switch(s_chat_proposed) {
        case 'open':
          toggleChat(true);
          break;
        case 'closed':
          toggleChat(false);
          break;
        default:
          toggleChat(false);
          delete anchor_map_proposed.chat;
          $.uriAnchor.setAnchor(anchor_map_proposed, null, true);
      }
    }

    return false;
  };

  onClickChat = function(event) {
    changeAnchorPart({
      chat: (stateMap.is_chat_retracted ? 'open' : 'closed')
    });
  };
  /* イベントハンドラ終了 */

  /* パブリックメソッド開始 */
  initModule = function($container) {
    // HTMLをロードし、jQueryコレクションをマッピングする
    stateMap.$container = $container;
    $container.html(configMap.main_html);
    setJqueryMap();

    stateMap.is_chat_retracted = true;
    jqueryMap.$chat
      .attr('title', configMap.chat_retracted_title)
      .click(onClickChat);

    // 我々のスキーマを使うようにuriAnchorを設定する
    $.uriAnchor.configModule({
      schema_map: configMap.anchor_schema_map
    });

    // 機能モジュールを構成して初期化する
    spa.chat.configModule({});
    spa.chat.initModule(jqueryMap.$chat);

    $(window)
      .bind('hashchange', onHashchange)
      .trigger('hashChange');
  };

  return { initModule: initModule };
  /* パブリックメソッド終了 */
}());
