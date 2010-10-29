(function($){

window.DropdownBase = new Class({

	Implements: [Events, Options],

	Binds: ['attach', 'detach', 'show', 'hide', 'toggle', 'focus', 'blur', 'select', 'onButtonKeyDown', 'onBodyKeyDown', 'onLiHover'],

	options: {
		fx: {duration: 'short', transition: 'quart:out'},
		initialHeight: 0
	},

	shown: false,
	button: null,
	buttonText: null,
	content: null,
	contentTop: null,
	contentBottom: null,
	focusedLi: null,
	selectedLi: null,

	initialize: function(button, content, options){
		this.button = $(button);
		this.content = $(content);
		this.contentTop = this.content.getPrevious('.dropdown-top');
		this.contentBottom = this.content.getNext('.dropdown-bottom');
		this.setOptions(options);
		this.attach();
	},

	attach: function(){
		this.button.addEvents({click: this.toggle, keydown: this.onButtonKeyDown});
		this.content.set('tween', this.options.fx);
		return this;
	},

	show: function(){
		this.shown = true;
		var height = this.content.getDimensions().y - this.content.getStyle('paddingTop').toInt() - this.content.getStyle('paddingBottom').toInt();
		var overflow = this.content.getStyle('overflow');
		this.content.setStyles({
			height: this.options.initialHeight,
			overflow: 'hidden'
		});
		this.button.addClass('active');
		if (this.contentTop) this.contentTop.show();
		if (this.contentBottom) this.contentBottom.show();
		this.content.show().get('tween').start('height', height).chain(function(){
			// reset the overflow to safari tab highlighting look better when possible
			this.content.setStyle('overflow', overflow);
		}.bind(this));
		this.content.addEvent('mouseleave', this.blur);
		this.content.getElements('li').addEvents({click: this.select, mouseenter: this.focus});
		$(document.body).addEvents({click: this.hide, keydown: this.onBodyKeyDown});
		return this;
	},

	hide: function(){
		this.shown = false;
		this.button.removeClass('active');
		this.content.hide();
		if (this.contentTop) this.contentTop.hide();
		if (this.contentBottom) this.contentBottom.hide();
		$(document.body).removeEvents({click: this.hide, keydown: this.onBodyKeyDown});
		return this;
	},

	toggle: function(e){
		e = new Event(e).stop();
		if (this.shown) return this.hide();
		return this.show();
	},

	focus: function(what){
		var el;
		if (what == 'up' || what == 'down') {
			if (this.focusedLi) el = this.focusedLi[what == 'up' ? 'getPrevious' : 'getNext']();
			if (!el) el = this.content.getElement('li' + (what == 'up' ? ':last-child' : ':first-child'));
		} else if ($type(what) == 'event') {
			el = $(new Event(what).target);
			if (el.get('tag') != 'li') el = el.getParent('li');
		}
		if (this.focusedLi) this.focusedLi.removeClass('focus');
		this.focusedLi = el.addClass('focus');
	},

	blur: function(){
		this.focusedLi.removeClass('focus');
		return this;
	},

	select: function(e){
		var el;
		if ($type(e) == 'event') {
			el = $(new Event(e).preventDefault().target);
			if (el.get('tag') != 'li') el = el.getParent('li');
		} else {
			el = this.focusedLi;
		}
		if (this.selectedLi) this.selectedLi.removeClass('selected');
		return this.selectedLi = el;
	},

	onBodyKeyDown: function(e){
		e = new Event(e);
		switch (e.key) {
			case 'up':
			case 'down':
				this.focus(e.key);
				e.preventDefault();
				break;

			case 'enter':
				this.select();
			case 'esc':
				this.hide();
				e.preventDefault();
				break;
		}
	},

	onButtonKeyDown: function(e){
		e = new Event(e);
		switch (e.key) {
			case 'up':
			case 'down':
				if (this.shown) return;
				e.preventDefault();
				this.show();
				break;
			case 'enter':
				e.preventDefault();
				if (this.shown) return this.select();
				this.show();
				break;
		}
	}

});

window.Dropdown = new Class({

	Extends: window.DropdownBase,

	select: function(e){
		var selected = this.parent(e);
		var btn = selected.getElement('button');
		if (btn) return btn.click();
		var a = selected.getElement('a');
		if (a) window.location = a.get('href');
		return selected;
	},

	focus: function(what){
		if (what == 'up' || what == 'down') {
			if (this.focusedLi) this.focusedLi.blur();
			this.parent(what);
			var el = this.focusedLi.getElement('a, button');
			if (el) el.focus();
		} else {
			this.parent(what);
		}
	}

});

window.DropdownSelect = new Class({

	Extends: window.DropdownBase,

	input: null,

	initialize: function(select, options){
		this.buttonText = new Element('strong', {text: select.options[select.selectedIndex].text});
		this.button = new Element('button', {'class': 'btn inline dropdown-toggle'})
			.grab(new Element('span').grab(this.buttonText));
		this.content = new Element('div', {'class': 'dropdown-content'});

		var wrapper = new Element('div', {
			'class': 'dropdown-wrapper f-lft ' + select.name + '-dropdown',
			'id': select.id ? select.id + '-dropdown' : null
		}).adopt([
			this.button,
			new Element('div', {'class': 'dropdown-box'}).adopt([
				new Element('div', {'class': 'dropdown-top'}).grab(new Element('div')),
				this.content,
				new Element('div', {'class': 'dropdown-bottom'}).grab(new Element('div'))
			])
		]);

		// populate the dropdown
		var list = new Element('ol', {'class': 'clearfix'}).inject(this.content);
		for (var i = 0, l = select.options.length; i < l; i++) {
			var opt = select.options[i];
			var li = new Element('li')
				.grab(new Element('span', {text: opt.text}))
				.store('DropdownSelect.value', opt.value);
			if (opt.selected) this.selectedLi = li.addClass('selected');
			list.grab(li);
		}

		var selectProps = select.getProperties('name', 'value', 'id', 'autocomplete', 'class');
		this.input = new Element('input', {type: 'hidden'}).setProperties(selectProps);

		wrapper.inject(this.input.replaces(select), 'after');

		this.parent(this.button, this.content, options);
	},

	select: function(e){
		var li = this.parent(e);
		li.addClass('selected');
		this.buttonText.set('text', li.get('text'));
		this.input.value = li.retrieve('DropdownSelect.value');
		this.hide();
		this.fireEvent('change', [this.input.get('value'), this.input]);
		return li;
	}

});

})(document.id);

window.addEvent('domready', function(){
	var logod = new Dropdown('logo-dropdown-toggle', 'logo-dropdown');
	var auto = $$('.dropdown-wrapper').map(function(el){
		return new Dropdown(el.getElement('.dropdown-toggle'), el.getElement('.dropdown-content'));
	});
	var selects = $$('select.dropdown-select').map(function(el){
		return new DropdownSelect(el);
	});
});