"""Independent finite-matrix checks of the coupling-to-overlap derivation."""
from pathlib import Path
import json,numpy as np
ROOT=Path(__file__).resolve().parent
rng=np.random.default_rng(20261110);errors={};counts={'positive_separation_distances':0,'projected_closed_certificates':0,'global_closed_certificates':0}
def check(name,a,b,inequality=False):
 a,b=np.asarray(a),np.asarray(b);err=float(np.max(np.maximum(a-b,0)) if inequality else np.max(abs(a-b)));scale=max(1.,float(np.max(abs(a))),float(np.max(abs(b))))
 errors[name]=max(errors.get(name,0),err/scale);assert err<3e-10*scale,(name,err,scale)
def sym(x):return (x+x.T)/2
def gram_bound(coeff,z):
 m=len(coeff)//2;flat=coeff.reshape(len(coeff),-1);G=flat@flat.T;E=(flat**2).sum(1).reshape(m,2).sum(1);j=E.repeat(2);keep=j>0
 if not keep.any():return np.zeros(len(z)),0.,E
 scaled=G[np.ix_(keep,keep)]/np.sqrt(j[keep,None]*j[None,keep]);kap=np.linalg.eigvalsh(scaled)[-1]
 return kap*((z.reshape(len(z),m,2)**2).sum(2)*E).sum(1),float(kap),E
def analyze(C,coeff,z,L):
 N,d,_=C.shape;H=np.array([sym(c) for c in C]);H0=H.mean(0);e,u=np.linalg.eigh(H0);e=e[::-1];u=u[:,::-1]
 for k in [2,4]:
  U,V=u[:,:k],u[:,k:];g=e[k-1]-e[k];Hcoeff=np.array([sym(c) for c in coeff]);fc=np.array([V.T@c@U for c in Hcoeff]);uc=np.array([U.T@c@U for c in Hcoeff]);vc=np.array([V.T@c@V for c in Hcoeff])
  crossbound,kapx,Ex=gram_bound(fc,z);up,_,_=gram_bound(uc,z);vp,_,_=gram_bound(vc,z);globalbound,_,_=gram_bound(coeff,z)
  check('projected_plane_strength',Ex,((coeff**2).sum((1,2)).reshape(-1,2).sum(1))/2,True)
  P0=U@U.T;projectors=[];leaks=[];bounds=[];delta_low=[]
  for D,HD in enumerate(H):
   ev,hat=np.linalg.eigh(HD);hat=hat[:,::-1];ev=ev[::-1];inside,outside=hat[:,:k],hat[:,k:]
   X,Y,B=U.T@HD@U,V.T@HD@V,V.T@HD@U;delta=np.linalg.eigvalsh(X)[0]-np.linalg.eigvalsh(Y)[-1]
   leak=np.linalg.norm(outside.T@U,'fro')**2/k;O=np.linalg.norm(U.T@inside,'fro')**2/k;P=inside@inside.T
   check('overlap_leak_identity',1-O,leak);check('projector_distance_identity',np.linalg.norm(P-P0,'fro')**2,2*k*leak)
   check('Courant_Fischer_selected',np.linalg.eigvalsh(X)[0],ev[k-1],True);check('Courant_Fischer_exterior',ev[k],np.linalg.eigvalsh(Y)[-1],True)
   check('cross_frequency_expansion',B,np.einsum('i,ijk->jk',z[D],fc));check('projected_Gram_bound',np.linalg.norm(B,'fro')**2,crossbound[D],True)
   A=U.T@(HD-H0)@U;F=V.T@(HD-H0)@V
   check('diagonal_block_Frobenius_identity',np.linalg.norm(HD-H0,'fro')**2,np.linalg.norm(A,'fro')**2+np.linalg.norm(F,'fro')**2+2*np.linalg.norm(B,'fro')**2)
   check('global_matrix_to_coupling',2*np.linalg.norm(B,'fro')**2,globalbound[D],True)
   check('projected_U_bound',np.linalg.norm(A,2)**2,up[D],True);check('projected_V_bound',np.linalg.norm(F,2)**2,vp[D],True)
   lower=g-np.sqrt(up[D])-np.sqrt(vp[D]);check('separation_lower_bound',lower,delta,True);delta_low.append(lower)
   if delta>0:
    counts['positive_separation_distances']+=1
    xi,W=np.linalg.eigh(X);Z=outside.T@U@W;rhs=outside.T@V@B@W
    check('residual_Sylvester_equation',ev[k:,None]*Z-Z*xi[None,:],rhs)
    check('entrywise_residual_leakage',np.linalg.norm(Z,'fro')**2,np.sum(rhs**2/(xi[None,:]-ev[k:,None])**2))
    check('squared_coupling_overlap_bound',leak,np.linalg.norm(B,'fro')**2/(k*delta**2),True)
    bounds.append(np.linalg.norm(B,'fro')**2/(k*delta**2))
   else:bounds.append(np.inf)
   projectors.append(P);leaks.append(leak)
  projectors=np.array(projectors);bar=projectors.mean(0);pair=np.mean([np.sum(projectors[i]*projectors[j])/k for i in range(N) for j in range(N) if i!=j]);ell=np.mean(leaks)
  exact=(N*np.linalg.norm(bar,'fro')**2-k)/((N-1)*k)
  check('all_pairs_projector_identity',pair,exact);check('reference_to_pairs_exact_identity',pair,1-2*N/(N-1)*ell+N/(k*(N-1))*np.linalg.norm(bar-P0,'fro')**2)
  check('reference_to_pairs_lower_bound',1-2*N/(N-1)*ell,pair,True)
  if np.isfinite(bounds).all():check('coupling_mean_overlap_bound',1-2*N/(N-1)*np.mean(bounds),pair,True)
  if min(delta_low)>0:
   counts['projected_closed_certificates']+=1
   check('closed_projected_Gram_certificate',1-2/(k*(N-1))*sum(crossbound/np.array(delta_low)**2),pair,True)
  eta=np.sqrt(globalbound)
  if g>2*max(eta):
   counts['global_closed_certificates']+=1
   check('global_Gram_subspace_certificate',1-sum(globalbound)/(k*(N-1)*(g-2*max(eta))**2),pair,True)

d,m,L=10,3,16;N=L+1;w=np.array([1e-4,.04,.8]);phase=np.stack([np.cos(np.arange(N)[:,None]*w),np.sin(np.arange(N)[:,None]*w)],2).reshape(N,-1);z=phase-phase.mean(0)
base=np.diag([7.,6.,5.,4.,.5,.2,0.,-.2,-.4,-.8])
for scale in [.005,.03,.1,.3]:
 coeff=rng.normal(size=(2*m,d,d))*scale;coeff[-2:]=0
 C=base+np.einsum('ni,ijk->njk',z,coeff);analyze(C,coeff,z,L)
 # A large common diagonal variation can leave subspaces unchanged.
 coeff[0]+=100*np.eye(d);C=1000*np.eye(d)+base+np.einsum('ni,ijk->njk',z,coeff);analyze(C,coeff,z,L)

# Zero cross coupling does not prevent a leading-space switch when the block separation reverses.
H0=np.diag([1.,0.]);H1=np.diag([0.,1.]);U=np.array([[1.],[0.]]);V=np.array([[0.],[1.]])
assert (V.T@H1@U).item()==0 and (U.T@H1@U-V.T@H1@V).item()<0
assert np.linalg.norm(U.T@np.linalg.eigh(H1)[1][:,-1:])**2==0

# An average-overlap statement permits a right-angle change in one direction.
k=32;U=np.eye(k+1)[:,:k];W=U.copy();W[:,-1]=np.eye(k+1)[:,-1]
check('one_changed_direction_overlap',np.linalg.norm(U.T@W,'fro')**2/k,31/32)

# Check the skew/squared-singular perturbation units used in the extension.
for _ in range(8):
 A0=rng.normal(size=(8,8));A0=(A0-A0.T)/2;E=rng.normal(size=(8,8))*.01;E=(E-E.T)/2;A=A0+E
 check('skew_squared_operator_bound',np.linalg.norm(A.T@A-A0.T@A0,2),(2*np.linalg.norm(A0,2)+np.linalg.norm(E,2))*np.linalg.norm(E,2),True)

assert counts['projected_closed_certificates']>0 and counts['global_closed_certificates']>0
out={'status':'PASS','seed':20261110,'scope':'Independent synthetic FP64 checks of algebra and sufficient bounds; no model-route certificate census or interval arithmetic.',
 'coupling_bound_requires_positive_block_separation':True,'gap_reversal_counterexample_included':True,**counts,'checks_max_relative_residual_or_violation':errors}
(ROOT/'subspace-proof-checks.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
