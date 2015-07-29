/** @jsx React.DOM */
var assert = require('chai').assert;
var _ = require('lodash');
var Explorer = require('../../../../client/js/app/components/explorer/index.js');
var Visualization = require('../../../../client/js/app/components/explorer/visualization/index.js');
var QueryBuilder = require('../../../../client/js/app/components/explorer/query_builder/index.js');
var QueryPaneTabs = require('../../../../client/js/app/components/explorer/query_pane_tabs.js');
var AddFavoriteModal = require('../../../../client/js/app/components/explorer/favorites/add_favorite_modal.js');
var BrowseFavorites = require('../../../../client/js/app/components/explorer/favorites/browse_favorites.js');
var Notice = require('../../../../client/js/app/components/common/notice.js');
var EventBrowser = require('../../../../client/js/app/components/common/event_browser.js');
var Persistence = require('../../../../client/js/app/modules/persistence/persistence.js');
var ExplorerStore = require('../../../../client/js/app/stores/ExplorerStore');
var ExplorerActions = require('../../../../client/js/app/actions/ExplorerActions');
var ExplorerValidations = require('../../../../client/js/app/validations/ExplorerValidations');
var ValidationUtils = require('../../../../client/js/app/utils/ValidationUtils');
var NoticeActions = require('../../../../client/js/app/actions/NoticeActions');
var ExplorerUtils = require('../../../../client/js/app/utils/ExplorerUtils');
var Modal = require('../../../../client/js/app/components/common/modal.js');
var React = require('react/addons');
var TestUtils = React.addons.TestUtils;
var TestHelpers = require('../../../support/TestHelpers.js');
var sinon = require('sinon');

describe('components/explorer/index', function() {

  before(function () {
    ExplorerStore.clearAll();
    ExplorerActions.create({ id: '1', active: true });
  });

  beforeEach(function(){
    this.client = TestHelpers.createClient();
    this.project = TestHelpers.createProject();
    this.config = { persistence: null };
    this.explorer = ExplorerStore.getAll()[Object.keys(ExplorerStore.getAll())[0]];
    this.component = TestUtils.renderIntoDocument(<Explorer client={this.client} project={this.project} config={this.config} />);
  });

  describe('setup', function() {

    it('is of the right type', function() {
      assert.isTrue(TestUtils.isCompositeComponentWithType(this.component, Explorer));
    });

    it('has a single Visualization child component', function(){
      assert.isNotNull(TestUtils.findRenderedComponentWithType(this.component, Visualization));
    });

    it('has a single QueryBuilder child component', function(){
      assert.isNotNull(TestUtils.findRenderedComponentWithType(this.component, QueryBuilder));
    });

    it('has a single EventBrowser child component', function(){
      assert.isNotNull(TestUtils.findRenderedComponentWithType(this.component, EventBrowser));
    });

    it('has the right number of Modal child components', function(){
      assert.lengthOf(TestUtils.scryRenderedComponentsWithType(this.component, Modal), 3);
    });

    it('has the right number of Modal child components when the analysis type is extraction', function(){
      this.explorer.query.analysis_type = 'extraction';
      ExplorerStore.emit('CHANGE');
      assert.lengthOf(TestUtils.scryRenderedComponentsWithType(this.component, Modal), 3);
    });

    describe('persistence', function(){

      describe('with persistence', function(){
        beforeEach(function(){
          this.persistence = { get: sinon.stub() };
          this.component = TestUtils.renderIntoDocument(<Explorer persistence={this.persistence} client={this.client} project={this.project} config={this.config} />);
        });

        it('has the QueryPaneTabs if persistence has been passed in', function(){
          assert.lengthOf(TestUtils.scryRenderedComponentsWithType(this.component, QueryPaneTabs), 1);
        });

        it('has the QueryBuilder component if persistence has not been passed in', function(){
          assert.lengthOf(TestUtils.scryRenderedComponentsWithType(this.component, QueryBuilder), 1);
        });

        it('has the AddFavoriteModal if persistence has been passed in', function(){
          assert.lengthOf(TestUtils.scryRenderedComponentsWithType(this.component, AddFavoriteModal), 1);
        });

        it('can show BrowseFavorites if persistence has been passed in', function(){
          TestUtils.Simulate.click(this.component.refs['query-pane-tabs'].refs['browse-tab'].getDOMNode());
          assert.lengthOf(TestUtils.scryRenderedComponentsWithType(this.component, BrowseFavorites), 1);
        });

        it('has the right number of Modal child components', function(){
          assert.lengthOf(TestUtils.scryRenderedComponentsWithType(this.component, Modal), 4);
        });
      });

      describe('without persistence', function(){
        beforeEach(function(){
          this.component = TestUtils.renderIntoDocument(<Explorer persistence={null} client={this.client} project={this.project} config={this.config} />);
        });

        it('does not have the QueryPaneTabs if persistence has not been passed in', function(){
          assert.lengthOf(TestUtils.scryRenderedComponentsWithType(this.component, QueryPaneTabs), 0);
        });

        it('does not have the AddFavoriteModal if persistence has not been passed in', function(){
          assert.lengthOf(TestUtils.scryRenderedComponentsWithType(this.component, AddFavoriteModal), 0);
        });

        it('does not have the BrowseFavorites if persistence has not been passed in', function(){
          assert.lengthOf(TestUtils.scryRenderedComponentsWithType(this.component, BrowseFavorites), 0);
        });
      });

    });
  });

  describe('basic interaction', function() {

    describe('tabbing between panes', function () {
      it('properly tabs from the query builder to browsing favorites', function () {
        this.component.setProps({ persistence: {} });
        TestUtils.Simulate.click(this.component.refs['query-pane-tabs'].refs['browse-tab'].getDOMNode());
        assert.lengthOf(TestUtils.scryRenderedComponentsWithType(this.component, BrowseFavorites), 1);
        assert.lengthOf(TestUtils.scryRenderedComponentsWithType(this.component, QueryBuilder), 0);
      });
      it('properly tabs from the query builder to browsing favorites', function () {
        this.component.setProps({ persistence: {} });
        this.component.setState({ activeQueryPane: 'browse' });
        TestUtils.Simulate.click(this.component.refs['query-pane-tabs'].refs['build-tab'].getDOMNode());

        assert.lengthOf(TestUtils.scryRenderedComponentsWithType(this.component, QueryBuilder), 1);
        assert.lengthOf(TestUtils.scryRenderedComponentsWithType(this.component, BrowseFavorites), 0);
      });
    });

    it('shows the proper notice if you run an empty query', function() {
      var queryBuilderForm = TestUtils.findRenderedDOMComponentWithTag(this.component, 'form');
      var getStub = sinon.stub(ExplorerStore, 'get').returns(this.explorer);
      TestUtils.Simulate.submit(queryBuilderForm);

      var notice = TestUtils.findRenderedComponentWithType(this.component, Notice);
      assert.notMatch(notice.getDOMNode().className, /hide/);
      assert.match(notice.getDOMNode().textContent, /Choose an Event Collection./);
      ExplorerStore.get.restore();
    });

    it('can launch the filter modal', function() {
      var filtersFieldsToggleNode = this.component.refs['query-builder'].refs['filters-fields-toggle'].refs['toggle-label'].getDOMNode();
      TestUtils.Simulate.click(filtersFieldsToggleNode);
      assert.match(this.component.refs['filter-manager'].refs.modal.getDOMNode().className, /block/);
    });

  });

  describe('Persisting', function () {

    beforeEach(function () {
      this.persistence = {
        create: function(){}
      };
      this.component = TestUtils.renderIntoDocument(<Explorer client={this.client}
                                                              config={{}}
                                                              project={this.project}
                                                              persistence={this.persistence} />);
    });

    describe('saveQueryClick', function () {
      before(function () {
        this.saveNewStub = sinon.stub(ExplorerActions, 'saveNew');
        this.saveExistingStub = sinon.stub(ExplorerActions, 'saveExisting');
      });
      after(function() {
        ExplorerActions.saveNew.restore();
        ExplorerActions.saveExisting.restore();
      });
      beforeEach(function() {
        this.saveNewStub.reset();
        this.saveExistingStub.reset();
      });

      describe('yet to be persisted explorers', function () {
        beforeEach(function(){
          this.explorer.id = 'TEMP-ABC';
          this.component.forceUpdate();
        });

        it('should run validations on the model', function () {
          var stub = sinon.stub(ValidationUtils, 'runValidations').returns({ isValid: false });
          this.component.saveQueryClick({ preventDefault: function(){} });
          assert.isTrue(stub.calledWith(ExplorerValidations.explorer, this.explorer.query));
          ValidationUtils.runValidations.restore();
        });
        it('should call ExplorerActions.saveNew if validations pass', function () {
          sinon.stub(ValidationUtils, 'runValidations').returns({ isValid: true });
          this.component.saveQueryClick({ preventDefault: function(){} });
          assert.isTrue(this.saveNewStub.calledOnce);
          ValidationUtils.runValidations.restore();
        });
      });

      describe('already persisted explorers', function () {
        beforeEach(function(){
          this.explorer.id = 'ABC';
          this.component.forceUpdate();
        });

        it('should run validations on the model', function () {
          var stub = sinon.stub(ValidationUtils, 'runValidations').returns({ isValid: false });
          this.component.saveQueryClick({ preventDefault: function(){} });
          assert.isTrue(stub.calledWith(ExplorerValidations.explorer, this.explorer.query));
          ValidationUtils.runValidations.restore();
        });
        it('should call ExplorerActions.saveExisting if validations pass', function () {
          sinon.stub(ValidationUtils, 'runValidations').returns({ isValid: true });
          this.component.saveQueryClick({ preventDefault: function(){} });
          assert.isTrue(this.saveExistingStub.calledOnce);
          ValidationUtils.runValidations.restore();
        });
      });
    });

    describe('destroyFavorite', function () {
      it('should call the destroy ExplorerAction with the right arguments', function () {
        this.explorer.id = 'ABC-DESTROY'
        var destroyStub = sinon.stub(ExplorerActions, 'destroy');
        sinon.stub(window, 'confirm').returns(true);
        this.component.destroyFavorite(TestHelpers.fakeEvent());
        assert.isTrue(destroyStub.calledWith(this.persistence, 'ABC-DESTROY'));
        ExplorerActions.destroy.restore();
        window.confirm.restore();
      });
    });

  });

  describe('component functions', function () {

    describe('favorites', function () {

      before(function(){
        this.explorer.query.analysis_type = 'count';
        ExplorerStore.emit('CHANGE');
      });

      beforeEach(function () {
        this.persistence = {};
        this.component = TestUtils.renderIntoDocument(<Explorer persistence={this.persistence} client={this.client} project={this.project} config={this.config} />);
      });
      
      describe('clicking a favorite', function () {
        it('should not load the favorite and show a notice if there is already a query in-flight', function () {
          var setActiveStub = sinon.stub(ExplorerActions, 'setActive');
          var execStub = sinon.stub(ExplorerActions, 'exec');
          var noticeCreateStub = sinon.stub(NoticeActions, 'create');

          var newExplorer = this.component.state.activeExplorer;
          newExplorer.loading = true;

          this.component.setState({
            activeExplorer: newExplorer
          });
          var fakeEvent = TestHelpers.fakeEvent();
          this.component.favoriteClicked(fakeEvent);
          
          assert.isFalse(setActiveStub.called);
          assert.isFalse(execStub.called);
          assert.isTrue(noticeCreateStub.calledWith({
            icon: 'info-sign',
            type: 'warning',
            text: "There is already a query in progress. Wait for it to finish loading before selecting a favorite."
          }));

          ExplorerActions.setActive.restore();
          ExplorerActions.exec.restore();
          NoticeActions.create.restore();
        });
      });

    });
  
  });

});